const fs = require('fs');
let code = fs.readFileSync('src/server-matrices.ts', 'utf8');

const deleteRoute = `
  // Delete matrix draft
  app.delete('/api/admin/matrices/:id', authenticate, requireMaster, async (req, res) => {
    try {
      const { id } = req.params;
      const uid = (req as any).user.uid;
      
      const matrixRef = db.collection('matrices').doc(id);
      
      await db.runTransaction(async (t) => {
        const doc = await t.get(matrixRef);
        if (!doc.exists) {
          throw new Error('NOT_FOUND');
        }
        
        const matrix = doc.data();
        if (matrix.status !== 'DRAFT') {
          throw new Error('NOT_DRAFT');
        }
        
        const assessQuery = db.collection('assessments').where('matrixId', '==', id).limit(1);
        const assessSnap = await t.get(assessQuery);
        if (!assessSnap.empty) {
          throw new Error('LINKED');
        }
        
        const reportsQuery = db.collection('reports').where('matrixId', '==', id).limit(1);
        const reportsSnap = await t.get(reportsQuery);
        if (!reportsSnap.empty) {
          throw new Error('LINKED');
        }
        
        t.delete(matrixRef);
        t.set(db.collection('auditLogs').doc(), {
          action: 'MATRIX_DELETED',
          matrixId: id,
          deletedBy: uid,
          timestamp: Date.now()
        });
      });
      
      res.json({ success: true });
    } catch (e: any) {
      if (e.message === 'NOT_FOUND') return res.status(404).json({ error: 'Matriz não encontrada' });
      if (e.message === 'NOT_DRAFT') return res.status(400).json({ error: 'Somente matrizes em rascunho podem ser excluídas' });
      if (e.message === 'LINKED') return res.status(400).json({ error: 'A matriz possui registros vinculados' });
      res.status(500).json({ error: e.message });
    }
  });
`;

code = code.replace(/(\/\/ Publish matrix)/, deleteRoute + '\n  $1');

fs.writeFileSync('src/server-matrices.ts', code);
