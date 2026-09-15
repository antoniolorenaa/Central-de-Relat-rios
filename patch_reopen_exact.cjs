const fs = require('fs');
let code = fs.readFileSync('src/server-reports.ts', 'utf8');

const targetIndex = code.indexOf("app.post('/api/academic/reports/:reportId/reopen'");
const endIdx = code.indexOf("});", targetIndex + 1000) + 3; // roughly finds the end of this route

// Wait, since there are many '});', finding the end is tricky. 
// Let's replace the whole route using regex.

code = code.replace(/app\.post\('\/api\/academic\/reports\/:reportId\/reopen', authenticate, requireCoordinationOrMaster, async \(req, res\) => \{[\s\S]*?\n  \}\);\n/m, 
`app.post('/api/academic/reports/:reportId/reopen', authenticate, requireCoordinationOrMaster, async (req, res) => {
    try {
      const { reportId } = req.params;
      const { period, enrollmentId, assessmentId, expectedRevision } = req.body;
      
      if (expectedRevision === undefined || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
        return res.status(400).json({ error: 'Revisão esperada não fornecida ou inválida.' });
      }
      const uid = (req as any).user.uid;
      
      if (!period || !enrollmentId || !assessmentId) return res.status(400).json({ error: 'Parâmetros insuficientes.' });

      const expectedReportId = \`rep_\${enrollmentId}_\${period}\`;
      if (reportId !== expectedReportId) return res.status(400).json({ error: 'ID de relatório incompatível.' });

      const reportRef = db.collection('reports').doc(reportId);

      const enrollmentSnap = await db.collection('enrollments').doc(enrollmentId).get();
      if (!enrollmentSnap.exists) return res.status(404).json({ error: 'Matrícula não encontrada.' });
      const enrollment = enrollmentSnap.data()!;

      const classSnap = await db.collection('classes').doc(enrollment.classId).get();
      const cls = classSnap.data()!;

      const hasAccess = await checkScope(uid, cls);
      if (!hasAccess) return res.status(403).json({ error: 'Acesso negado a este aluno.' });

      const finalState = await db.runTransaction(async (t) => {
        const doc = await t.get(reportRef);
        if (!doc.exists) throw new Error('Relatório não encontrado.');
        
        const reportData = doc.data()!;

        if (reportData.revision !== expectedRevision) {
          throw new Error('CONCURRENCY_CONFLICT');
        }

        if (reportData.assessmentId !== assessmentId) {
          throw new Error('O ID de avaliação diverge do vinculado ao relatório.');
        }

        const assDoc = await t.get(db.collection('assessments').doc(reportData.assessmentId));
        if (!assDoc.exists) {
          throw new Error('Avaliação vinculada inexistente.');
        }
        
        const assData = assDoc.data()!;
        if (assData.enrollmentId !== enrollmentId) {
          throw new Error('Vínculos inconsistentes entre avaliação, matrícula e relatório.');
        }

        if (reportData.reportStatus !== 'VALIDATED') {
          return reportData; 
        }

        const assStatus = assData.status || 'NOT_STARTED';
        
        reportData.reportStatus = determineReportStatus({ ...reportData, reportStatus: '' }, assStatus); 
        reportData.revision = (reportData.revision || 0) + 1;
        reportData.updatedAt = Date.now();
        reportData.updatedBy = uid;
        
        delete reportData.validatedBy;
        delete reportData.validatedAt;
        delete reportData.validatedAssessmentRevision;
        delete reportData.validatedMatrixId;
        delete reportData.validatedMatrixVersion;

        t.set(reportRef, reportData);
        
        // Write audit log
        const auditRef = db.collection('auditLogs').doc();
        t.set(auditRef, {
          action: 'REPORT_REOPENED',
          reportId: reportData.id,
          studentId: reportData.studentId,
          classId: reportData.classId,
          uid,
          timestamp: Date.now()
        });

        return reportData;
      });

      res.json({ success: true, report: finalState });
    } catch (e: any) {
      if (e.message === 'CONCURRENCY_CONFLICT') return res.status(409).json({ error: 'Este relatório foi atualizado por outro usuário. Recarregue para continuar.' });
      if (e.message === 'O ID de avaliação diverge do vinculado ao relatório.') return res.status(400).json({ error: e.message });
      if (e.message === 'Avaliação vinculada inexistente.') return res.status(404).json({ error: e.message });
      if (e.message === 'Vínculos inconsistentes entre avaliação, matrícula e relatório.') return res.status(400).json({ error: e.message });
      if (e.message === 'Relatório não encontrado.') return res.status(404).json({ error: e.message });
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });\n`);

fs.writeFileSync('src/server-reports.ts', code);
