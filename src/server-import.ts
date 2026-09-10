import express from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';

// 1. IDs DETERMINÍSTICOS SEGUROS
function generateDeterministicId(prefix: string, parts: string[]) {
  const canonical = parts.join('|');
  const hash = crypto.createHash('sha256').update(canonical).digest('hex');
  return `${prefix}_${hash}`;
}

export function registerImportRoutes(app: express.Express, db: FirebaseFirestore.Firestore, authenticate: any, requireMaster: any) {
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

  app.post('/api/admin/import/preview', authenticate, requireMaster, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      }

      // Hash File Binário Real
      const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');

      // Parse File
      let rawRows: any[] = [];
      try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      } catch (err) {
        return res.status(400).json({ error: 'Arquivo inválido. Formato não suportado ou corrompido.' });
      }

      // 3. MINIMIZAÇÃO DE DADOS (Allowlist Estrita)
      // Extrai APENAS os campos necessários e autorizados, bloqueando vazamento de dados sensíveis.
      const allowedRows = rawRows.map(row => ({
        rawBrand: String(row['Rede'] || '').trim(),
        rawUnit: String(row['Escola'] || '').trim(),
        rawGradeLevelCombo: String(row['Serie'] || '').trim(),
        rawClassName: String(row['Turma'] || '').trim(),
        rawStatus: String(row['Status'] || '').trim(),
        rawSchoolYear: String(row['AnoLetivo'] || '2026').trim(),
        rawShift: String(row['Turno'] || '').trim(),
        rawName: String(row['Aluno'] || '').trim(),
        rawExternalId: String(row['Matricula'] || '').trim(),
        rawEmail: String(row['E-mail do Educacional do aluno'] || row['E-mail'] || '').trim()
      }));

      // Destrói os dados brutos da memória explicitamente
      rawRows = [];

      const [brandsSnap, unitsSnap, glSnap, programsSnap, glpSnap, enrollmentsSnap] = await Promise.all([
        db.collection('brands').get(),
        db.collection('units').get(),
        db.collection('gradeLevels').get(),
        db.collection('programs').get(),
        db.collection('gradeLevelPrograms').get(),
        db.collection('enrollments').where('schoolYear', 'in', ['2026', '2027']).get() 
      ]);

      const brands = brandsSnap.docs.map(d => d.data());
      const units = unitsSnap.docs.map(d => d.data());
      const gradeLevels = glSnap.docs.map(d => d.data());
      const programs = programsSnap.docs.map(d => d.data());
      const glps = glpSnap.docs.map(d => d.data());
      const existingEnrollments = enrollmentsSnap.docs.map(d => d.data());

      let totalRows = 0, validRows = 0, invalidRows = 0, conflicts = 0;
      let newStudents = 0, newEnrollments = 0, updatedEnrollments = 0, unchangedRows = 0;
      
      const processedRows = [];
      const sourceSystem = 'MOTIVO'; // Identificador fixo da origem nesta fase

      for (let i = 0; i < allowedRows.length; i++) {
        const row = allowedRows[i];
        
        if (!row.rawName && !row.rawExternalId) continue;
        totalRows++;

        let status: string = 'VALID';
        let message = '';
        
        // Normalização Explícita
        const brandMatch = brands.find(b => b.name.toLowerCase() === row.rawBrand.toLowerCase() || b.code === row.rawBrand.toUpperCase());
        const unitMatch = units.find(u => u.name.toLowerCase() === row.rawUnit.toLowerCase() || u.code === row.rawUnit.toUpperCase());

        let gradeLevelMatch = null;
        let programMatch = null;
        const isBilingual = row.rawGradeLevelCombo.toLowerCase().includes('bilíngue') || row.rawGradeLevelCombo.toLowerCase().includes('bilingue');
        
        programMatch = programs.find(p => p.code === (isBilingual ? 'BILINGUAL' : 'REGULAR'));
        
        for (const gl of gradeLevels) {
          if (row.rawGradeLevelCombo.toLowerCase().includes(gl.name.toLowerCase())) {
            gradeLevelMatch = gl;
            break;
          }
        }

        let glpMatch = null;
        if (gradeLevelMatch && programMatch) {
          glpMatch = glps.find(glp => glp.gradeLevelId === gradeLevelMatch.id && glp.programId === programMatch.id);
        }

        let shiftNorm = 'MORNING';
        const sLower = row.rawShift.toLowerCase();
        if (sLower.startsWith('t') || sLower.includes('vespertino')) shiftNorm = 'AFTERNOON';
        if (sLower.includes('integral')) shiftNorm = 'FULL_TIME';

        if (!row.rawName || !row.rawExternalId || !brandMatch || !unitMatch || !gradeLevelMatch || !programMatch || !glpMatch) {
          status = 'INVALID';
          invalidRows++;
          if (!glpMatch && gradeLevelMatch && programMatch) message = 'Combinação Série/Programa não cadastrada.';
          else message = 'Dados ausentes ou ambíguos. Verifique Marca, Unidade e Série.';
        } else {
          // IDENTIDADE LONGITUDINAL: A identidade é sempre garantida por sourceSystem + externalStudentId
          const studentId = generateDeterministicId('std', [sourceSystem, row.rawExternalId]);
          const enrollmentId = generateDeterministicId('enr', [sourceSystem, row.rawExternalId, row.rawSchoolYear]);
          
          const existingEnrollment = existingEnrollments.find(e => e.id === enrollmentId);
          const studentEnrolls = existingEnrollments.filter(e => e.studentId === studentId);

          if (studentEnrolls.length === 0) {
            status = 'NEW_STUDENT';
            newStudents++;
            newEnrollments++;
            validRows++;
          } else if (!existingEnrollment) {
            status = 'NEW_ENROLLMENT';
            newEnrollments++;
            validRows++;
          } else {
            if (existingEnrollment.unitId !== unitMatch.id || 
                existingEnrollment.gradeLevelId !== gradeLevelMatch.id ||
                existingEnrollment.shift !== shiftNorm) {
              status = 'UPDATE';
              updatedEnrollments++;
              validRows++;
            } else {
              status = 'UNCHANGED';
              unchangedRows++;
              validRows++;
            }
          }
        }

        processedRows.push({
          id: uuidv4(),
          rowNumber: i + 2,
          status,
          message,
          ...row,
          brandId: brandMatch?.id,
          unitId: unitMatch?.id,
          gradeLevelId: gradeLevelMatch?.id,
          programId: programMatch?.id,
          shift: shiftNorm,
          enrollmentStatus: row.rawStatus.toLowerCase().includes('matriculado') ? 'ACTIVE' : 'INACTIVE',
        });
      }

      const batchId = uuidv4();
      const uid = (req as any).user.uid;

      const previousBatches = await db.collection('importBatches').where('fileHash', '==', fileHash).get();
      const alreadyImportedWarning = !previousBatches.empty && previousBatches.docs.some(d => d.data().status === 'IMPORTED');

      const importBatch = {
        id: batchId,
        filename: req.file.originalname,
        fileHash,
        sourceSystem,
        schoolYear: '2026', 
        uploadedBy: uid,
        uploadedAt: Date.now(),
        totalRows,
        validRows,
        invalidRows,
        newStudents,
        newEnrollments,
        updatedEnrollments,
        unchangedRows,
        conflicts,
        status: 'READY_TO_IMPORT',
        alreadyImportedWarning
      };

      await db.collection('importBatches').doc(batchId).set(importBatch);

      const chunkSize = 400;
      for (let i = 0; i < processedRows.length; i += chunkSize) {
        const chunk = processedRows.slice(i, i + chunkSize);
        const fbBatch = db.batch();
        chunk.forEach(row => {
          fbBatch.set(db.collection('importBatches').doc(batchId).collection('rows').doc(row.id), row);
        });
        await fbBatch.commit();
      }

      res.json({ success: true, batch: importBatch, previewRows: processedRows.slice(0, 100) });
    } catch (e: any) {
      console.error("Preview error:", e.message);
      res.status(500).json({ error: 'Erro no processamento. Linha com formato inválido.' });
    }
  });

  app.get('/api/admin/import/history', authenticate, requireMaster, async (req, res) => {
    try {
      const batchesSnap = await db.collection('importBatches').orderBy('uploadedAt', 'desc').limit(20).get();
      const batches = batchesSnap.docs.map(d => d.data());
      
      const usersSnap = await db.collection('users').get();
      const usersMap = new Map();
      usersSnap.forEach(u => usersMap.set(u.id, u.data().name));

      const history = batches.map(b => ({
        ...b,
        uploadedByName: usersMap.get(b.uploadedBy) || 'Usuário Desconhecido'
      }));

      res.json({ success: true, history });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: 'Erro ao buscar histórico: ' + e.message });
    }
  });

  app.post('/api/admin/import/confirm', authenticate, requireMaster, async (req, res) => {
    try {
      const { batchId } = req.body;
      if (!batchId) return res.status(400).json({ error: 'Batch ID obrigatório.' });

      const batchDoc = await db.collection('importBatches').doc(batchId).get();
      if (!batchDoc.exists) return res.status(404).json({ error: 'Batch não encontrado.' });
      
      const batchData = batchDoc.data()!;
      if (batchData.status === 'IMPORTED') {
        return res.status(400).json({ error: 'Este arquivo já foi importado com sucesso anteriormente.' });
      }

      // Permite Retomada Segura
      await db.collection('importBatches').doc(batchId).update({ status: 'IMPORTING' });

      const rowsSnap = await db.collection('importBatches').doc(batchId).collection('rows').get();
      const rows = rowsSnap.docs.map(d => d.data());

      let currentFbBatch = db.batch();
      let opCount = 0;
      let chunksProcessed = 0;

      const commitBatch = async () => {
        if (opCount > 0) {
          await currentFbBatch.commit();
          chunksProcessed++;
          currentFbBatch = db.batch();
          opCount = 0;
        }
      };

      const classMap = new Map();

      try {
        for (const row of rows) {
          if (row.status === 'INVALID' || row.status === 'CONFLICT') continue;

          // 1. Chave determinística de Turma
          const normalizedClassName = row.rawClassName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const classId = generateDeterministicId('cls', [
            row.brandId, 
            row.unitId, 
            row.rawSchoolYear, 
            row.gradeLevelId, 
            row.programId, 
            row.shift, 
            normalizedClassName
          ]);
          
          if (!classMap.has(classId)) {
            classMap.set(classId, true);
            currentFbBatch.set(db.collection('classes').doc(classId), {
              id: classId,
              brandId: row.brandId,
              unitId: row.unitId,
              schoolYear: row.rawSchoolYear,
              gradeLevelId: row.gradeLevelId,
              programId: row.programId,
              displayName: row.rawClassName,
              shift: row.shift,
              active: true,
              updatedAt: Date.now()
            }, { merge: true });
            opCount++;
          }

          // 2. Chave determinística do Aluno
          const studentId = generateDeterministicId('std', [batchData.sourceSystem, row.rawExternalId]);
          
          if (row.status === 'NEW_STUDENT' || row.status === 'NEW_ENROLLMENT' || row.status === 'UPDATE') {
            currentFbBatch.set(db.collection('students').doc(studentId), {
              id: studentId,
              name: row.rawName,
              nameNormalized: row.rawName.toLowerCase(),
              educationalEmail: row.rawEmail,
              active: true,
              updatedAt: Date.now()
            }, { merge: true });
            opCount++;
          }

          // 3. Chave determinística da Matrícula
          const enrollmentId = generateDeterministicId('enr', [batchData.sourceSystem, row.rawExternalId, row.rawSchoolYear]);
          
          if (row.status === 'NEW_ENROLLMENT' || row.status === 'UPDATE' || row.status === 'NEW_STUDENT') {
            currentFbBatch.set(db.collection('enrollments').doc(enrollmentId), {
              id: enrollmentId,
              studentId: studentId,
              sourceSystem: batchData.sourceSystem,
              externalStudentId: row.rawExternalId,
              schoolYear: row.rawSchoolYear,
              brandId: row.brandId,
              unitId: row.unitId,
              gradeLevelId: row.gradeLevelId,
              programId: row.programId,
              classId: classId,
              shift: row.shift,
              enrollmentStatus: row.enrollmentStatus,
              active: true,
              lastSeenImportBatchId: batchId,
              updatedAt: Date.now()
            }, { merge: true });
            opCount++;
          }

          // Mantém opCount estritamente abaixo do limite de 500
          if (opCount >= 400) {
            await commitBatch();
          }
        }

        await commitBatch();

        await db.collection('importBatches').doc(batchId).update({
          status: 'IMPORTED',
          confirmedAt: Date.now(),
          chunksProcessed
        });

        res.json({ success: true });

      } catch (batchErr: any) {
        console.error("Batch Import Failed Midway:", batchErr.message);
        // RECUPERAÇÃO DE IMPORTAÇÃO PARCIAL
        await db.collection('importBatches').doc(batchId).update({
          status: 'PARTIALLY_IMPORTED',
          errorMsg: batchErr.message,
          chunksProcessed
        });
        throw new Error(`A importação falhou parcialmente. ${chunksProcessed} lotes concluídos.`);
      }

    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: 'Erro na confirmação: ' + e.message });
    }
  });
}
