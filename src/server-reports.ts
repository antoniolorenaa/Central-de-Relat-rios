import express from 'express';
import { getFirestore } from 'firebase-admin/firestore';

export function registerReportsRoutes(app: express.Express, db: FirebaseFirestore.Firestore, authenticate: any) {
  // Transfer Report to a new Matrix
  app.post('/api/academic/reports/:reportId/transfer', authenticate, async (req, res) => {
    try {
      const { reportId } = req.params;
      const { enrollmentId, period, newMatrixId, newMatrixVersion, expectedRevision } = req.body;
      const uid = (req as any).user.uid;

      if (!period || !enrollmentId || !newMatrixId) return res.status(400).json({ error: 'Parâmetros insuficientes.' });

      const expectedReportId = `rep_${enrollmentId}_${period}`;
      if (reportId !== expectedReportId) return res.status(400).json({ error: 'ID de relatório incompatível.' });

      const reportRef = db.collection('reports').doc(reportId);
      const enrollmentSnap = await db.collection('enrollments').doc(enrollmentId).get();
      if (!enrollmentSnap.exists) return res.status(404).json({ error: 'Matrícula não encontrada.' });
      const enrollment = enrollmentSnap.data();

      const classSnap = await db.collection('classes').doc(enrollment.classId).get();
      const cls = classSnap.data();
      const hasAccess = await checkScope(uid, cls);
      if (!hasAccess) return res.status(403).json({ error: 'Acesso negado a este aluno.' });

      const newAssessmentId = `ass_${enrollmentId}_${newMatrixId}_${period}`;
      const newAssRef = db.collection('assessments').doc(newAssessmentId);

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
        if (strengths !== undefined && typeof strengths === 'string') reportData.strengths = strengths;
        if (developmentAspects !== undefined && typeof developmentAspects === 'string') reportData.developmentAspects = developmentAspects;
        if (additionalInformation !== undefined && typeof additionalInformation === 'string') reportData.additionalInformation = additionalInformation;
        if (finalText !== undefined && typeof finalText === 'string') reportData.finalText = finalText;

        if (!reportData.finalText?.trim()) {
          throw new Error('MISSING_FINAL_TEXT');
        }
        
        // Se matriz também estiver divergente na mesma base, devemos rejeitar.
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
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });


  // Middleware to enforce COORDINATION or MASTER role
  const requireCoordinationOrMaster = async (req, res, next) => {
    const uid = req.user.uid;
    try {
      const userSnap = await db.collection('users').doc(uid).get();
      if (!userSnap.exists) return res.status(403).json({ error: 'Acesso negado.' });
      const userData = userSnap.data();
      if (userData?.role !== 'MASTER' && userData?.role !== 'COORDINATION') {
        return res.status(403).json({ error: 'Apenas coordenadores ou administradores podem executar esta ação.' });
      }
      next();
    } catch (e) {
      res.status(500).json({ error: 'Erro ao verificar permissão.' });
    }
  };

  
  // Helper to check scope
  const checkScope = async (uid: string, cls: any) => {
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) return false;
    const userData = userSnap.data()!;
    if (userData.role === 'MASTER') return true;

    const userScopes = userData.scopes || [];
    return userScopes.some((scope: any) => {
      const brandMatch = scope.brandId === cls.brandId;
      const unitMatch = !scope.unitId || scope.unitId === cls.unitId;
      const glMatch = !scope.gradeLevelIds || scope.gradeLevelIds.length === 0 || scope.gradeLevelIds.includes(cls.gradeLevelId);
      return brandMatch && unitMatch && glMatch;
    });
  };

  // Helper to determine status
  const determineReportStatus = (data: any, assessmentStatus: string) => {
    if (data.reportStatus === 'VALIDATED') return 'VALIDATED';
    
    const hasContent = !!(data.strengths?.trim() || data.developmentAspects?.trim() || data.additionalInformation?.trim() || data.finalText?.trim());
    
    if (!hasContent) return 'NOT_STARTED';
    
    if (assessmentStatus === 'COMPLETED' && data.finalText?.trim()) {
      return 'READY_FOR_REVIEW';
    }
    
    return 'IN_PROGRESS';
  };

  // Autosave report fields
  app.post('/api/academic/reports/:reportId', authenticate, async (req, res) => {
    try {
      const { reportId } = req.params;
      const { period, enrollmentId, assessmentId, strengths, developmentAspects, additionalInformation, finalText, expectedRevision, matrixId } = req.body;
      const uid = (req as any).user.uid;

      if (!period || !enrollmentId || !assessmentId) return res.status(400).json({ error: 'Parâmetros insuficientes.' });
      
      const expectedReportId = `rep_${enrollmentId}_${period}`;
      if (reportId !== expectedReportId) return res.status(400).json({ error: 'ID de relatório incompatível.' });

      // Verify Enrollment
      const enrollmentSnap = await db.collection('enrollments').doc(enrollmentId).get();
      if (!enrollmentSnap.exists) return res.status(404).json({ error: 'Matrícula não encontrada.' });
      const enrollment = enrollmentSnap.data()!;

      // Verify Class and Scope
      const classSnap = await db.collection('classes').doc(enrollment.classId).get();
      if (!classSnap.exists) return res.status(404).json({ error: 'Turma não encontrada.' });
      const cls = classSnap.data()!;

      const hasAccess = await checkScope(uid, cls);
      if (!hasAccess) return res.status(403).json({ error: 'Acesso negado a este aluno.' });

      let assessmentStatus = 'NOT_STARTED';
      let matrixVersion = 1;
      let actualMatrixId = matrixId;
      
      const assDoc = await db.collection('assessments').doc(assessmentId).get();
        
      if (assDoc.exists) {
        const assData = assDoc.data()!;
        assessmentStatus = assData.status;
        matrixVersion = assData.matrixVersion || 1;
        actualMatrixId = assData.matrixId || matrixId;
      }

      const reportRef = db.collection('reports').doc(reportId);

      const finalState = await db.runTransaction(async (t) => {
        const doc = await t.get(reportRef);
        let reportData: any;

        if (doc.exists) {
          reportData = doc.data();
          
          if (reportData.reportStatus === 'VALIDATED') {
            throw new Error('REPORT_VALIDATED');
          }
          
          if (expectedRevision !== undefined && reportData.revision !== expectedRevision) {
            throw new Error('CONCURRENCY_CONFLICT');
          }
          
          reportData.revision = (reportData.revision || 0) + 1;
          reportData.matrixVersion = matrixVersion;
          reportData.matrixId = actualMatrixId;
        } else {
          reportData = {
            id: reportId,
            studentId: enrollment.studentId,
            enrollmentId,
            classId: cls.id,
            assessmentId,
            matrixId: actualMatrixId || '',
            matrixVersion,
            schoolYear: cls.schoolYear,
            period,
            strengths: '',
            developmentAspects: '',
            additionalInformation: '',
            finalText: '',
            reportStatus: 'NOT_STARTED',
            revision: 1,
            createdAt: Date.now(),
            createdBy: uid
          };
        }

        if (strengths !== undefined) reportData.strengths = strengths;
        if (developmentAspects !== undefined) reportData.developmentAspects = developmentAspects;
        if (additionalInformation !== undefined) reportData.additionalInformation = additionalInformation;
        if (finalText !== undefined) reportData.finalText = finalText;

        reportData.reportStatus = determineReportStatus(reportData, assessmentStatus);
        reportData.updatedAt = Date.now();
        reportData.updatedBy = uid;

        t.set(reportRef, reportData);
        return reportData;
      });

      res.json({ success: true, report: finalState });
    } catch (e: any) {
      if (e.message === 'CONCURRENCY_CONFLICT') {
        return res.status(409).json({ error: 'Este relatório foi atualizado por outro usuário. Recarregue para continuar.' });
      }
      if (e.message === 'REPORT_VALIDATED') {
        return res.status(400).json({ error: 'Este relatório já foi validado e não pode ser editado.' });
      }
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Validate Report
  app.post('/api/academic/reports/:reportId/validate', authenticate, requireCoordinationOrMaster, async (req, res) => {
    try {
      const { reportId } = req.params;
      const { period, enrollmentId, assessmentId, expectedRevision, strengths, developmentAspects, additionalInformation, finalText } = req.body;
      const uid = (req as any).user.uid;
      
      if (!period || !enrollmentId) return res.status(400).json({ error: 'Parâmetros insuficientes.' });

      const expectedReportId = `rep_${enrollmentId}_${period}`;
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
        if (strengths !== undefined && typeof strengths === 'string') reportData.strengths = strengths;
        if (developmentAspects !== undefined && typeof developmentAspects === 'string') reportData.developmentAspects = developmentAspects;
        if (additionalInformation !== undefined && typeof additionalInformation === 'string') reportData.additionalInformation = additionalInformation;
        if (finalText !== undefined && typeof finalText === 'string') reportData.finalText = finalText;

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
      res.status(500).json({ error: e.message });
    }
  });

  // Reopen Report
  app.post('/api/academic/reports/:reportId/reopen', authenticate, requireCoordinationOrMaster, async (req, res) => {
    try {
      const { reportId } = req.params;
      const { period, enrollmentId, assessmentId, expectedRevision } = req.body;
      const uid = (req as any).user.uid;
      
      if (!period || !enrollmentId || !assessmentId) return res.status(400).json({ error: 'Parâmetros insuficientes.' });

      const expectedReportId = `rep_${enrollmentId}_${period}`;
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

        if (expectedRevision !== undefined && reportData.revision !== expectedRevision) {
          throw new Error('CONCURRENCY_CONFLICT');
        }
        
        // Check assessment to see if it should go back to READY_FOR_REVIEW or IN_PROGRESS
        const assDoc = await t.get(db.collection('assessments').doc(assessmentId));
        const assStatus = assDoc.exists ? assDoc.data()!.status : 'NOT_STARTED';
        
        reportData.reportStatus = determineReportStatus({ ...reportData, reportStatus: '' }, assStatus); // Pass empty string to avoid early return 'VALIDATED'
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
      res.status(500).json({ error: e.message });
    }
  });

}
