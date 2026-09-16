import express from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

const upload = multer({ storage: multer.memoryStorage() });

export function registerMatricesRoutes(app: express.Express, db: FirebaseFirestore.Firestore, authenticate: any, requireMaster: any) {
  
  // Gets all matrices (Master only)
  app.get('/api/admin/matrices', authenticate, requireMaster, async (req, res) => {
    try {
      const snap = await db.collection('matrices').orderBy('updatedAt', 'desc').get();
      const matrices = snap.docs.map(d => d.data());
      res.json({ success: true, matrices });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Create empty draft manually
  app.post('/api/admin/matrices', authenticate, requireMaster, async (req, res) => {
    try {
      const { brandId, gradeLevelId, programId, schoolYear, period } = req.body;
      const uid = (req as any).user.uid;

      const matrixId = uuidv4();
      const matrix = {
        id: matrixId,
        brandId,
        gradeLevelId,
        programId,
        schoolYear,
        period,
        version: 1,
        status: 'DRAFT',
        categories: [],
        criteria: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: uid
      };

      await db.collection('matrices').doc(matrixId).set(matrix);
      res.json({ success: true, matrix });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Import matrix
  app.post('/api/admin/matrices/import', authenticate, requireMaster, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

      const { brandId, gradeLevelId, programId, schoolYear, period } = req.body;
      const uid = (req as any).user.uid;


      // Check if a DRAFT already exists for this exact combination
      const existingDraftSnap = await db.collection('matrices')
        .where('brandId', '==', brandId)
        .where('gradeLevelId', '==', gradeLevelId)
        .where('programId', '==', programId)
        .where('schoolYear', '==', schoolYear)
        .where('period', '==', period)
        .where('status', '==', 'DRAFT')
        .get();

      if (!existingDraftSnap.empty) {
        return res.status(400).json({ error: 'Já existe um rascunho de matriz para esta combinação. Exclua ou publique o rascunho antes de importar novamente.' });
      }

      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = xlsx.utils.sheet_to_json(sheet);

      const criteria: any[] = [];
      const categories = new Set<string>();


      function normalizeKey(k) {
        return k.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      }

const errors = [];

      rows.forEach((row, idx) => {
        const normalizedRow = {};
        for (const k of Object.keys(row)) {
          normalizedRow[normalizeKey(k)] = row[k];
        }

        const category = normalizedRow['categoria']?.toString().trim();
        const codeValue = normalizedRow['codigo']?.toString().trim();
        const objective = normalizedRow['objetivo']?.toString().trim();
        const orderRaw = normalizedRow['ordem']?.toString();
        const reqRaw = normalizedRow['obrigatorio']?.toString();
        
        if (!category || !codeValue || !objective) {
          errors.push(`Linha ${idx + 2}: Faltam dados obrigatórios (Categoria, Código ou Objetivo).`);
          return;
        }

        categories.add(category);
        
        let order = parseInt(orderRaw, 10);
        if (isNaN(order)) order = idx + 1;

        let required = true;
        if (reqRaw && (reqRaw.toLowerCase() === 'não' || reqRaw.toLowerCase() === 'nao' || reqRaw.toLowerCase() === 'false' || reqRaw === '0')) {
          required = false;
        }

        criteria.push({
          id: uuidv4(),
          code: codeValue,
          objective,
          category,
          order,
          required,
          active: true
        });
      });

      if (errors.length > 0) {
        return res.status(400).json({ error: 'Importação falhou devido a erros nas seguintes linhas:\n' + errors.join('\n') });
      }

      if (criteria.length === 0) {
        return res.status(400).json({ error: 'O arquivo não contém objetivos válidos. Verifique se os cabeçalhos são: Categoria, Código, Objetivo, Ordem, Obrigatório.' });
      }

      const matrixId = uuidv4();
      const matrix = {
        id: matrixId,
        brandId,
        gradeLevelId,
        programId,
        schoolYear,
        period,
        version: 1,
        status: 'DRAFT',
        categories: Array.from(categories),
        criteria: criteria.sort((a, b) => a.order - b.order),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: uid
      };

      await db.collection('matrices').doc(matrixId).set(matrix);
      res.json({ success: true, matrix });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  
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

  // Publish matrix
  app.post('/api/admin/matrices/:id/publish', authenticate, requireMaster, async (req, res) => {
    try {
      const { id } = req.params;
      const matrixRef = db.collection('matrices').doc(id);
      const doc = await matrixRef.get();

      if (!doc.exists) return res.status(404).json({ error: 'Matriz não encontrada' });
      const matrix = doc.data()!;

      if (matrix.status === 'PUBLISHED') return res.status(400).json({ error: 'Matriz já está publicada.' });

      // Validations
      if (!matrix.criteria || matrix.criteria.length === 0) {
        return res.status(400).json({ error: 'A matriz precisa ter pelo menos um critério para ser publicada.' });
      }

      const codes = new Set();
      const objectives = new Set();
      
      for (const crit of matrix.criteria) {
        if (!crit.category) return res.status(400).json({ error: `O critério ${crit.code} está sem categoria.` });
        if (!crit.objective) return res.status(400).json({ error: `O critério ${crit.code} está sem objetivo.` });
        
        if (codes.has(crit.code)) return res.status(400).json({ error: `Código duplicado encontrado: ${crit.code}` });
        codes.add(crit.code);

        // Removed duplicate objective validation
        objectives.add(crit.objective);
      }

      // Check for conflicts with existing PUBLISHED matrices (same brand, grade, program, year, period)
      // Actually, we shouldn't have two PUBLISHED matrices with the exact same combination.
      const existingSnap = await db.collection('matrices')
        .where('brandId', '==', matrix.brandId)
        .where('gradeLevelId', '==', matrix.gradeLevelId)
        .where('programId', '==', matrix.programId)
        .where('schoolYear', '==', matrix.schoolYear)
        .where('period', '==', matrix.period)
        .where('status', '==', 'PUBLISHED')
        .get();

      if (!existingSnap.empty) {
        // Archive the old one to allow the new one to be published (this is a common pattern to 'update' a published matrix -> new version)
        const batch = db.batch();
        existingSnap.docs.forEach(d => {
          batch.update(d.ref, { status: 'ARCHIVED', updatedAt: Date.now() });
        });
        
        // Ensure new matrix gets a higher version
        let maxVer = matrix.version || 1;
        existingSnap.docs.forEach(d => {
          if (d.data().version >= maxVer) maxVer = d.data().version + 1;
        });
        matrix.version = maxVer;
        
        batch.update(matrixRef, { 
          status: 'PUBLISHED', 
          version: matrix.version,
          publishedAt: Date.now(), 
          updatedAt: Date.now() 
        });
        
        await batch.commit();
      } else {
        await matrixRef.update({
          status: 'PUBLISHED',
          publishedAt: Date.now(),
          updatedAt: Date.now()
        });
      }

      const finalDoc = await matrixRef.get();
      res.json({ success: true, matrix: finalDoc.data() });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Get active matrix for a specific class and period
  app.get('/api/academic/classes/:classId/matrix', authenticate, async (req, res) => {
    try {
      const { classId } = req.params;
      const { period } = req.query;

      if (!period) return res.status(400).json({ error: 'Período não especificado.' });

      const classSnap = await db.collection('classes').doc(classId).get();
      if (!classSnap.exists) return res.status(404).json({ error: 'Turma não encontrada.' });
      const cls = classSnap.data()!;

      // Find published matrices matching gradeLevel, schoolYear and period
      const matricesSnap = await db.collection('matrices')
        .where('status', '==', 'PUBLISHED')
        .where('gradeLevelId', '==', cls.gradeLevelId)
        .where('schoolYear', '==', cls.schoolYear)
        .where('period', '==', period)
        .get();

      const matrices = matricesSnap.docs.map(d => d.data());

      if (matrices.length === 0) {
        return res.json({ success: true, matrix: null });
      }

      // Filter by Brand (Exact or GLOBAL) and Program (Exact or ALL)
      const validMatrices = matrices.filter(m => 
        (m.brandId === cls.brandId || m.brandId === 'GLOBAL') &&
        (m.programId === cls.programId || m.programId === 'ALL')
      );

      if (validMatrices.length === 0) {
        return res.json({ success: true, matrix: null });
      }

      // Priority Resolution
      // 1. Exact Brand + Exact Program
      // 2. Exact Brand + ALL Programs
      // 3. GLOBAL Brand + Exact Program
      // 4. GLOBAL Brand + ALL Programs
      const getPriority = (m: any) => {
        let score = 0;
        if (m.brandId === cls.brandId) score += 2;
        if (m.programId === cls.programId) score += 1;
        return score; // Max 3, Min 0
      };

      // Sort descending by score
      validMatrices.sort((a, b) => getPriority(b) - getPriority(a));

      const highestScore = getPriority(validMatrices[0]);
      const topPriority = validMatrices.filter(m => getPriority(m) === highestScore);

      if (topPriority.length > 1) {
        return res.status(409).json({ error: 'Conflito de configuração: Múltiplas matrizes com a mesma prioridade encontradas para esta turma.' });
      }

      res.json({ success: true, matrix: topPriority[0] });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

}
