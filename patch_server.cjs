const fs = require('fs');
let code = fs.readFileSync('src/server-matrices.ts', 'utf8');

const importUuid = `import { v4 as uuidv4 } from 'uuid';`;
if (!code.includes(importUuid)) {
  code = code.replace(`import type { Express, Request, Response, NextFunction } from 'express';`, `import type { Express, Request, Response, NextFunction } from 'express';\nimport { v4 as uuidv4 } from 'uuid';`);
}

const endpointCode = `
  // Edit matrix
  app.put('/api/admin/matrices/:id', authenticate, requireMaster, async (req, res) => {
    try {
      const { id } = req.params;
      const { brandId, gradeLevelId, programId, schoolYear, period, criteria, expectedRevision } = req.body;
      const uid = (req as any).user.uid;

      if (!brandId || !gradeLevelId || !programId || !schoolYear || !period || !criteria || !Array.isArray(criteria)) {
        return res.status(400).json({ error: 'Dados inválidos ou incompletos.' });
      }
      
      if (criteria.length === 0) {
        return res.status(400).json({ error: 'A matriz precisa ter pelo menos um critério.' });
      }

      // Validations for criteria
      const codes = new Set();
      for (const crit of criteria) {
        if (!crit.code || !crit.objective || !crit.category || typeof crit.order !== 'number' || typeof crit.required !== 'boolean') {
          return res.status(400).json({ error: \`Critério inválido encontrado (Código: \${crit.code}). Verifique os campos.\` });
        }
        if (codes.has(crit.code)) {
          return res.status(400).json({ error: \`Código duplicado encontrado: \${crit.code}\` });
        }
        codes.add(crit.code);
        // Ensure id exists
        if (!crit.id) crit.id = uuidv4();
        crit.active = true;
      }
      
      const categories = Array.from(new Set(criteria.map(c => c.category)));

      const matrixRef = db.collection('matrices').doc(id);

      await db.runTransaction(async (t) => {
        const doc = await t.get(matrixRef);
        if (!doc.exists) {
          throw new Error('NOT_FOUND');
        }
        
        const matrix = doc.data();
        const rev = matrix.revision || 0;
        
        // Concurrency check
        if (expectedRevision !== undefined && expectedRevision !== rev) {
          throw new Error('CONFLICT_REVISION');
        }

        if (matrix.status === 'DRAFT') {
          // Check if another draft exists for this combination
          const query = db.collection('matrices')
            .where('status', '==', 'DRAFT')
            .where('brandId', '==', brandId)
            .where('gradeLevelId', '==', gradeLevelId)
            .where('programId', '==', programId)
            .where('schoolYear', '==', schoolYear)
            .where('period', '==', period);
            
          const snaps = await t.get(query);
          const conflicts = snaps.docs.filter(d => d.id !== id);
          if (conflicts.length > 0) {
            throw new Error('CONFLICT_COMBINATION:' + conflicts[0].id);
          }
          
          t.update(matrixRef, {
            brandId,
            gradeLevelId,
            programId,
            schoolYear,
            period,
            criteria: criteria.sort((a, b) => a.order - b.order),
            categories,
            updatedAt: Date.now(),
            revision: rev + 1
          });
          
          t.set(db.collection('auditLogs').doc(), {
            action: 'MATRIX_EDITED',
            matrixId: id,
            editedBy: uid,
            timestamp: Date.now()
          });
        } else {
          // PUBLISHED or ARCHIVED -> Create a new DRAFT
          // Check if ANY draft exists for this combination
          const query = db.collection('matrices')
            .where('status', '==', 'DRAFT')
            .where('brandId', '==', brandId)
            .where('gradeLevelId', '==', gradeLevelId)
            .where('programId', '==', programId)
            .where('schoolYear', '==', schoolYear)
            .where('period', '==', period)
            .limit(1);
            
          const snaps = await t.get(query);
          if (!snaps.empty) {
            throw new Error('CONFLICT_COMBINATION:' + snaps.docs[0].id);
          }
          
          const newMatrixId = uuidv4();
          const newMatrixRef = db.collection('matrices').doc(newMatrixId);
          
          t.set(newMatrixRef, {
            id: newMatrixId,
            originMatrixId: id,
            brandId,
            gradeLevelId,
            programId,
            schoolYear,
            period,
            version: matrix.version, // Keep same base version, publishing will increment it
            status: 'DRAFT',
            categories,
            criteria: criteria.sort((a, b) => a.order - b.order),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdBy: uid,
            revision: 0
          });
          
          t.set(db.collection('auditLogs').doc(), {
            action: 'MATRIX_BRANCHED',
            originMatrixId: id,
            newMatrixId: newMatrixId,
            editedBy: uid,
            timestamp: Date.now()
          });
        }
      });
      
      res.json({ success: true });
    } catch (e: any) {
      if (e.message === 'NOT_FOUND') return res.status(404).json({ error: 'Matriz não encontrada' });
      if (e.message === 'CONFLICT_REVISION') return res.status(409).json({ error: 'A matriz foi modificada por outro usuário. Recarregue a página.' });
      if (e.message.startsWith('CONFLICT_COMBINATION:')) {
        const existingDraftId = e.message.split(':')[1];
        return res.status(409).json({ error: 'Já existe um rascunho para esta combinação.', existingDraftId });
      }
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });
`;

code = code.replace(`// Publish matrix`, endpointCode + `\n  // Publish matrix`);

fs.writeFileSync('src/server-matrices.ts', code);
