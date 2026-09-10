const fs = require('fs');
let code = fs.readFileSync('src/server-reports.ts', 'utf8');

const regexTransfer = /app\.post\('\/api\/academic\/reports\/:reportId\/transfer'[\s\S]*?\}\n  \}\);/m;

const replacementTransfer = `app.post('/api/academic/reports/:reportId/transfer', authenticate, async (req, res) => {
    try {
      const { reportId } = req.params;
      const { enrollmentId, period, newMatrixId, newMatrixVersion, expectedRevision } = req.body;
      const uid = (req as any).user.uid;

      if (!period || !enrollmentId || !newMatrixId) return res.status(400).json({ error: 'Parâmetros insuficientes.' });

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

      const newAssessmentId = \`ass_\${enrollmentId}_\${newMatrixId}_\${period}\`;

      const finalState = await db.runTransaction(async (t) => {
        const doc = await t.get(reportRef);
        if (!doc.exists) throw new Error('Relatório não encontrado.');
        
        const reportData = doc.data()!;
        
        if (reportData.reportStatus === 'VALIDATED') {
          throw new Error('Relatórios já validados não podem ser transferidos.');
        }

        if (expectedRevision !== undefined && reportData.revision !== expectedRevision) {
          throw new Error('CONCURRENCY_CONFLICT');
        }

        const oldAssessmentId = reportData.assessmentId;

        reportData.assessmentId = newAssessmentId;
        reportData.matrixId = newMatrixId;
        reportData.matrixVersion = newMatrixVersion;
        reportData.revision = (reportData.revision || 0) + 1;
        reportData.updatedAt = Date.now();
        reportData.updatedBy = uid;

        t.set(reportRef, reportData);

        // Write audit log
        const auditRef = db.collection('auditLogs').doc();
        t.set(auditRef, {
          action: 'REPORT_TRANSFERRED',
          reportId: reportData.id,
          studentId: enrollment.studentId,
          classId: enrollment.classId,
          oldAssessmentId: oldAssessmentId || null,
          newAssessmentId,
          newMatrixId,
          newMatrixVersion,
          uid,
          timestamp: Date.now()
        });

        return reportData;
      });

      res.json({ success: true, report: finalState });
    } catch (e: any) {
      if (e.message === 'CONCURRENCY_CONFLICT') return res.status(409).json({ error: 'Este relatório foi atualizado por outro usuário. Recarregue para continuar.' });
      if (e.message === 'Relatórios já validados não podem ser transferidos.') return res.status(400).json({ error: e.message });
      if (e.message === 'Relatório não encontrado.') return res.status(404).json({ error: e.message });
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });`;

code = code.replace(regexTransfer, replacementTransfer);

const regexValidate = /app\.post\('\/api\/academic\/reports\/:reportId\/validate'[\s\S]*?\}\n  \}\);/m;

const replacementValidate = `app.post('/api/academic/reports/:reportId/validate', authenticate, requireCoordinationOrMaster, async (req, res) => {
    try {
      const { reportId } = req.params;
      const { period, enrollmentId, assessmentId, expectedRevision, strengths, developmentAspects, additionalInformation, finalText } = req.body;
      const uid = (req as any).user.uid;
      
      if (!period || !enrollmentId) return res.status(400).json({ error: 'Parâmetros insuficientes.' });

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
        
        if (reportData.reportStatus === 'VALIDATED') {
          return reportData; // already validated
        }

        if (expectedRevision === undefined || typeof expectedRevision !== 'number') {
          throw new Error('Revisão esperada não fornecida ou inválida.');
        }

        if (reportData.revision !== expectedRevision) {
          throw new Error('CONCURRENCY_CONFLICT');
        }
        
        if (!reportData.assessmentId) {
          throw new Error('Relatório sem avaliação vinculada.');
        }

        if (assessmentId && reportData.assessmentId !== assessmentId) {
          throw new Error('O ID de avaliação diverge do vinculado ao relatório.');
        }

        const realAssessmentId = reportData.assessmentId;
        
        const assDoc = await t.get(db.collection('assessments').doc(realAssessmentId));
        if (!assDoc.exists) {
           throw new Error('Avaliação vinculada inexistente.');
        }
        
        const assData = assDoc.data()!;

        // CONFERÊNCIA DOS VÍNCULOS
        if (
          assData.enrollmentId !== enrollmentId ||
          assData.studentId !== enrollment.studentId ||
          assData.classId !== enrollment.classId ||
          assData.schoolYear !== enrollment.schoolYear ||
          assData.period !== period
        ) {
           throw new Error('Vínculos inconsistentes entre avaliação, matrícula e relatório.');
        }

        if (assData.status !== 'COMPLETED') {
          throw new Error('INVALID_ASSESSMENT_STATUS');
        }

        // Save pending changes before validation
        if (strengths !== undefined) {
          if (typeof strengths !== 'string') throw new Error('INVALID_TEXT_FIELD');
          reportData.strengths = strengths;
        }
        if (developmentAspects !== undefined) {
          if (typeof developmentAspects !== 'string') throw new Error('INVALID_TEXT_FIELD');
          reportData.developmentAspects = developmentAspects;
        }
        if (additionalInformation !== undefined) {
          if (typeof additionalInformation !== 'string') throw new Error('INVALID_TEXT_FIELD');
          reportData.additionalInformation = additionalInformation;
        }
        if (finalText !== undefined) {
          if (typeof finalText !== 'string') throw new Error('INVALID_TEXT_FIELD');
          reportData.finalText = finalText;
        }

        if (!reportData.finalText?.trim()) {
          throw new Error('MISSING_FINAL_TEXT');
        }
        
        if (reportData.matrixId && reportData.matrixId !== assData.matrixId) {
          throw new Error('MATRIX_MISMATCH');
        }

        reportData.reportStatus = 'VALIDATED';
        reportData.validatedBy = uid;
        reportData.validatedAt = Date.now();
        reportData.validatedAssessmentRevision = assData.revision;
        reportData.validatedMatrixId = assData.matrixId;
        reportData.validatedMatrixVersion = assData.matrixVersion;
        reportData.revision = (reportData.revision || 0) + 1;
        reportData.updatedAt = Date.now();
        reportData.updatedBy = uid;

        t.set(reportRef, reportData);
        
        // Write audit log
        const auditRef = db.collection('auditLogs').doc();
        t.set(auditRef, {
          action: 'REPORT_VALIDATED',
          reportId: reportData.id,
          validatedBy: uid,
          validatedAt: Date.now(),
          assessmentRevision: assData.revision,
          matrixId: assData.matrixId || '',
          matrixVersion: assData.matrixVersion || 1
        });

        return reportData;
      });

      res.json({ success: true, report: finalState });
    } catch (e: any) {
      if (e.message === 'CONCURRENCY_CONFLICT') return res.status(409).json({ error: 'Este relatório foi atualizado por outro usuário. Recarregue para continuar.' });
      if (e.message === 'INVALID_ASSESSMENT_STATUS') return res.status(400).json({ error: 'Avaliação precisa estar COMPLETED.' });
      if (e.message === 'MISSING_FINAL_TEXT') return res.status(400).json({ error: 'Parecer não pode estar vazio.' });
      if (e.message === 'INVALID_TEXT_FIELD') return res.status(400).json({ error: 'Os campos textuais devem ser strings.' });
      if (e.message === 'O ID de avaliação diverge do vinculado ao relatório.') return res.status(400).json({ error: e.message });
      if (e.message === 'Vínculos inconsistentes entre avaliação, matrícula e relatório.') return res.status(400).json({ error: e.message });
      if (e.message === 'MATRIX_MISMATCH') return res.status(400).json({ error: 'A matriz do relatório diverge da avaliação.' });
      if (e.message === 'Revisão esperada não fornecida ou inválida.') return res.status(400).json({ error: e.message });
      if (e.message === 'Avaliação vinculada inexistente.') return res.status(404).json({ error: e.message });
      if (e.message === 'Relatório sem avaliação vinculada.') return res.status(400).json({ error: e.message });
      if (e.message === 'Relatório não encontrado.') return res.status(404).json({ error: e.message });
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });`;

code = code.replace(regexValidate, replacementValidate);

fs.writeFileSync('src/server-reports.ts', code);
console.log("Patched both correctly");
