const fs = require('fs');
let code = fs.readFileSync('src/server-reports.ts', 'utf8');

const regex = /app\.post\('\/api\/academic\/reports\/:reportId\/transfer', authenticate, async \(req, res\) => \{[\s\S]*?res\.json\(\{ success: true, report: finalState \}\);\n    \} catch \(e\) \{\n      console\.error\(e\);\n      res\.status\(500\)\.json\(\{ error: e\.message \}\);\n    \}\n  \}\);/m;

const replacement = `  app.post('/api/academic/reports/:reportId/transfer', authenticate, async (req, res) => {
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
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/server-reports.ts', code);
  console.log("Transfer route restored");
} else {
  console.log("Could not find transfer route");
}
