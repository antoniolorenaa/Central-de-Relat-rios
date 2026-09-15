const fs = require('fs');
let code = fs.readFileSync('src/server-reports.ts', 'utf8');

const oldReopen = `  app.post('/api/academic/reports/:reportId/reopen', authenticate, requireCoordinationOrMaster, async (req, res) => {
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
        
        if (reportData.reportStatus !== 'VALIDATED') {
          return reportData; 
        }

        if (reportData.revision !== expectedRevision) {
            throw new Error('CONCURRENCY_CONFLICT');
          }
        
        const nextRevision = reportData.revision + 1;
        const assRef = db.collection('assessments').doc(assessmentId);
        const assDoc = await t.get(assRef);
        let currentAssStatus = 'NOT_STARTED';
        
        if (assDoc.exists) {
            currentAssStatus = assDoc.data()!.status;
        }

        const newReportStatus = reportData.finalText && currentAssStatus === 'COMPLETED' ? 'READY_FOR_REVIEW' : 'IN_PROGRESS';

        t.set(reportRef, {
            ...reportData,
            reportStatus: newReportStatus,
            revision: nextRevision,
            updatedAt: new Date().toISOString()
        });

        const auditRef = db.collection('audits').doc();
        t.set(auditRef, {
            entity: 'REPORT',
            entityId: reportId,
            action: 'STATUS_CHANGED',
            changes: { oldStatus: 'VALIDATED', newStatus: newReportStatus },
            user: uid,
            timestamp: new Date().toISOString()
        });

        return { ...reportData, reportStatus: newReportStatus, revision: nextRevision };
      });
      return res.status(200).json({ success: true, report: finalState });
    } catch (e: any) {
        if (e.message === 'CONCURRENCY_CONFLICT') {
            return res.status(409).json({ error: 'O relatório foi modificado por outro usuário. Recarregue a página e tente novamente.' });
        }
      return res.status(500).json({ error: 'Erro interno ao processar validação.' });
    }
  });`;

const newReopen = `  app.post('/api/academic/reports/:reportId/reopen', authenticate, requireCoordinationOrMaster, async (req, res) => {
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
        if (!doc.exists) throw new Error('NOT_FOUND_Relatório não encontrado.');
        
        const reportData = doc.data()!;
        
        if (reportData.revision !== expectedRevision) {
            throw new Error('CONCURRENCY_CONFLICT');
        }

        if (reportData.assessmentId !== assessmentId) {
            throw new Error('BAD_REQUEST_ID de assessment divergente no relatório.');
        }

        const assRef = db.collection('assessments').doc(reportData.assessmentId);
        const assDoc = await t.get(assRef);
        if (!assDoc.exists) {
            throw new Error('NOT_FOUND_Assessment não encontrado.');
        }

        const assData = assDoc.data()!;
        if (assData.enrollmentId !== enrollmentId) {
            throw new Error('BAD_REQUEST_Vínculos inconsistentes.');
        }
        
        if (reportData.reportStatus !== 'VALIDATED') {
          return reportData; 
        }

        const currentAssStatus = assData.status || 'NOT_STARTED';
        const nextRevision = reportData.revision + 1;
        const newReportStatus = reportData.finalText && currentAssStatus === 'COMPLETED' ? 'READY_FOR_REVIEW' : 'IN_PROGRESS';

        t.set(reportRef, {
            ...reportData,
            reportStatus: newReportStatus,
            revision: nextRevision,
            updatedAt: new Date().toISOString()
        });

        const auditRef = db.collection('audits').doc();
        t.set(auditRef, {
            entity: 'REPORT',
            entityId: reportId,
            action: 'STATUS_CHANGED',
            changes: { oldStatus: 'VALIDATED', newStatus: newReportStatus },
            user: uid,
            timestamp: new Date().toISOString()
        });

        return { ...reportData, reportStatus: newReportStatus, revision: nextRevision };
      });
      return res.status(200).json({ success: true, report: finalState });
    } catch (e: any) {
        if (e.message === 'CONCURRENCY_CONFLICT') {
            return res.status(409).json({ error: 'O relatório foi modificado por outro usuário. Recarregue a página e tente novamente.' });
        }
        if (e.message.startsWith('BAD_REQUEST_')) {
            return res.status(400).json({ error: e.message.replace('BAD_REQUEST_', '') });
        }
        if (e.message.startsWith('NOT_FOUND_')) {
            return res.status(404).json({ error: e.message.replace('NOT_FOUND_', '') });
        }
      return res.status(500).json({ error: 'Erro interno ao processar validação.' });
    }
  });`;

// Wait, the file might have been modified since my view? I should use replace logic safely.
const exactIndex = code.indexOf(oldReopen.substring(0, 100));
if (exactIndex === -1) {
  // Try regex replace
  console.log("Using regex replace for reopen");
  code = code.replace(/app\.post\('\/api\/academic\/reports\/:reportId\/reopen'[\s\S]*?\}\);/m, newReopen);
} else {
  code = code.replace(oldReopen, newReopen);
}

fs.writeFileSync('src/server-reports.ts', code);
