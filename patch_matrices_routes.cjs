const fs = require('fs');
let code = fs.readFileSync('src/server-matrices.ts', 'utf8');

if (!code.includes("import { FieldValue }")) {
  code = code.replace("import { getFirestore } from 'firebase-admin/firestore';", "import { getFirestore, FieldValue } from 'firebase-admin/firestore';");
}

const newRoutes = `
  // Get matrix impact
  app.get('/api/admin/matrices/:id/impact', authenticate, requireMaster, async (req, res) => {
    try {
      const { id } = req.params;
      const matrixSnap = await db.collection('matrices').doc(id).get();
      if (!matrixSnap.exists) return res.status(404).json({ error: 'Matriz não encontrada.' });
      
      const assessQuery = await db.collection('assessments').where('matrixId', '==', id).get();
      const assessmentsCount = assessQuery.size;
      const affectedStudents = new Set();
      
      assessQuery.docs.forEach(d => {
        affectedStudents.add(d.data().studentId);
      });

      const reportsQuery = await db.collection('reports').where('matrixId', '==', id).get();
      const reportsCount = reportsQuery.size;
      let validatedReportsCount = 0;
      
      reportsQuery.docs.forEach(d => {
        if (d.data().reportStatus === 'VALIDATED') {
          validatedReportsCount++;
        }
      });

      res.json({
        success: true,
        impact: {
          assessmentsCount,
          affectedStudentsCount: affectedStudents.size,
          reportsCount,
          validatedReportsCount
        }
      });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Force delete matrix
  app.post('/api/admin/matrices/:id/force-delete', authenticate, requireMaster, async (req, res) => {
    try {
      const { id } = req.params;
      const { expectedAssessments, expectedReports, expectedValidated } = req.body;
      const uid = (req as any).user.uid;

      let assessmentsSnapshot;
      let reportsSnapshot;
      
      await db.runTransaction(async (t) => {
        const matrixRef = db.collection('matrices').doc(id);
        const matrixDoc = await t.get(matrixRef);
        if (!matrixDoc.exists) throw new Error('NOT_FOUND');
        if (matrixDoc.data()?.status === 'DELETING') throw new Error('ALREADY_DELETING');

        // Check counts
        assessmentsSnapshot = await t.get(db.collection('assessments').where('matrixId', '==', id));
        reportsSnapshot = await t.get(db.collection('reports').where('matrixId', '==', id));

        const assessCount = assessmentsSnapshot.size;
        const repCount = reportsSnapshot.size;
        let valCount = 0;
        reportsSnapshot.docs.forEach(d => {
          if (d.data().reportStatus === 'VALIDATED') valCount++;
        });

        if (assessCount !== expectedAssessments || repCount !== expectedReports || valCount !== expectedValidated) {
          throw new Error('COUNTS_MISMATCH');
        }

        t.update(matrixRef, { status: 'DELETING', updatedAt: Date.now() });
      });

      const chunks = [];
      let currentChunk = db.batch();
      let opCount = 0;

      const commitChunk = () => {
        chunks.push(currentChunk.commit());
        currentChunk = db.batch();
        opCount = 0;
      };

      reportsSnapshot.docs.forEach(doc => {
        currentChunk.update(doc.ref, {
          reportStatus: 'IN_PROGRESS',
          assessmentId: null,
          matrixId: null,
          matrixVersion: null,
          validatedBy: FieldValue.delete(),
          validatedAt: FieldValue.delete(),
          validatedAssessmentRevision: FieldValue.delete(),
          validatedMatrixId: FieldValue.delete(),
          validatedMatrixVersion: FieldValue.delete(),
          updatedAt: Date.now(),
          updatedBy: uid
        });
        opCount++;
        if (opCount >= 400) commitChunk();
      });

      assessmentsSnapshot.docs.forEach(doc => {
        currentChunk.delete(doc.ref);
        opCount++;
        if (opCount >= 400) commitChunk();
      });
      
      currentChunk.delete(db.collection('matrices').doc(id));
      opCount++;
      
      currentChunk.set(db.collection('auditLogs').doc(), {
        action: 'MATRIX_FORCE_DELETED',
        matrixId: id,
        deletedBy: uid,
        assessmentsDeleted: expectedAssessments,
        reportsModified: expectedReports,
        timestamp: Date.now()
      });

      chunks.push(currentChunk.commit());
      await Promise.all(chunks);

      res.json({ success: true });
    } catch (e: any) {
      if (e.message === 'NOT_FOUND') return res.status(404).json({ error: 'Matriz não encontrada.' });
      if (e.message === 'ALREADY_DELETING') return res.status(409).json({ error: 'Matriz já está em processo de exclusão.' });
      if (e.message === 'COUNTS_MISMATCH') return res.status(409).json({ error: 'Os registros mudaram desde a confirmação. Atualize a prévia.' });
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });
`;

if (!code.includes('/api/admin/matrices/:id/force-delete')) {
  code = code.replace(`// Publish matrix`, newRoutes + `\n  // Publish matrix`);
}

fs.writeFileSync('src/server-matrices.ts', code);
