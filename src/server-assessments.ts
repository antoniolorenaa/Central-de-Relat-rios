import express from 'express';
import { getFirestore } from 'firebase-admin/firestore';

export function registerAssessmentRoutes(app: express.Express, db: FirebaseFirestore.Firestore, authenticate: any) {
  
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

  // Get evaluation data context (matrices and assessments) for a class and period
  app.get('/api/academic/classes/:classId/evaluation-data', authenticate, async (req, res) => {
    try {
      const { classId } = req.params;
      const { period } = req.query;
      const uid = (req as any).user.uid;

      if (!period) {
        return res.status(400).json({ error: 'Parâmetro period obrigatório.' });
      }

      const classSnap = await db.collection('classes').doc(classId).get();
      if (!classSnap.exists) return res.status(404).json({ error: 'Turma não encontrada.' });
      const cls = classSnap.data()!;

      const hasAccess = await checkScope(uid, cls);
      if (!hasAccess) return res.status(403).json({ error: 'Acesso negado a esta turma.' });

      // 1. Fetch Assessments (without enforcing matrixVersion, to support historical versions)
      const assessmentsSnap = await db.collection('assessments')
        .where('classId', '==', classId)
        .where('period', '==', period)
        .get();

      const assessments = assessmentsSnap.docs.map(d => d.data());

      // 1b. Fetch Reports
      const reportsSnap = await db.collection('reports')
        .where('classId', '==', classId)
        .where('period', '==', period)
        .get();
        
      const reports = reportsSnap.docs.map(d => d.data());

      // 2. Fetch Active Matrix for this class (if any exists)
      const activeMatricesSnap = await db.collection('matrices')
        .where('status', '==', 'PUBLISHED')
        .where('gradeLevelId', '==', cls.gradeLevelId)
        .where('schoolYear', '==', cls.schoolYear)
        .where('period', '==', period)
        .get();

      const publishedMatrices = activeMatricesSnap.docs.map(d => d.data());
      let activeMatrix = null;
      let configConflict = false;

      if (publishedMatrices.length > 0) {
        const validMatrices = publishedMatrices.filter(m =>
          (m.brandId === cls.brandId || m.brandId === 'GLOBAL') &&
          (m.programId === cls.programId || m.programId === 'ALL')
        );

        if (validMatrices.length > 0) {
          const getPriority = (m: any) => {
            let score = 0;
            if (m.brandId === cls.brandId) score += 2;
            if (m.programId === cls.programId) score += 1;
            return score; // Max 3, Min 0
          };

          validMatrices.sort((a, b) => getPriority(b) - getPriority(a));
          const highestScore = getPriority(validMatrices[0]);
          const topPriority = validMatrices.filter(m => getPriority(m) === highestScore);

          if (topPriority.length > 1) {
            configConflict = true;
          } else {
            activeMatrix = topPriority[0];
          }
        }
      }

      // 3. Fetch Historical Matrices (for assessments already bound to an older version)
      const historicalMatrixIds = new Set<string>();
      assessments.forEach(a => {
        if (activeMatrix && a.matrixId === activeMatrix.id) return;
        historicalMatrixIds.add(a.matrixId);
      });

      const historicalMatrices: any[] = [];
      if (historicalMatrixIds.size > 0) {
        const ids = Array.from(historicalMatrixIds);
        // Firestore 'in' query allows up to 10 items per batch
        for (let i = 0; i < ids.length; i += 10) {
          const chunk = ids.slice(i, i + 10);
          const hmSnap = await db.collection('matrices').where('id', 'in', chunk).get();
          hmSnap.docs.forEach(d => historicalMatrices.push(d.data()));
        }
      }

      res.json({
        success: true,
        assessments,
        reports,
        activeMatrix,
        historicalMatrices,
        configConflict
      });

    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Autosave evaluation answer
  app.post('/api/academic/assessments/:assessmentId/answers', authenticate, async (req, res) => {
    try {
      const { assessmentId } = req.params;
      const { criterionId, answer, period, matrixId, matrixVersion, expectedRevision, enrollmentId } = req.body;
      const uid = (req as any).user.uid;

      if (!period || !matrixId || matrixVersion === undefined || !enrollmentId) {
        return res.status(400).json({ error: 'Parâmetros insuficientes da matriz.' });
      }
      
      // Ensure assessmentId matches expected format
      const expectedAssessmentId = `ass_${enrollmentId}_${matrixId}_${period}`;
      if (assessmentId !== expectedAssessmentId) {
        return res.status(400).json({ error: 'ID de assessment inválido ou incompatível.' });
      }

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

      // Verify Matrix
      const matrixSnap = await db.collection('matrices').doc(matrixId).get();
      if (!matrixSnap.exists) return res.status(404).json({ error: 'Matriz não encontrada.' });
      const matrix = matrixSnap.data()!;

      if (matrix.version !== matrixVersion) {
        return res.status(400).json({ error: 'Versão da matriz incompatível.' });
      }

      // Run Transaction for Concurrency and Counters
      const assessmentRef = db.collection('assessments').doc(assessmentId);

      
      const reportId = `rep_${enrollmentId}_${period}`;
      const reportRef = db.collection('reports').doc(reportId);

      const finalState = await db.runTransaction(async (t) => {
        const doc = await t.get(assessmentRef);
        const reportDoc = await t.get(reportRef);
        let assessmentData: any;

        if (doc.exists) {
          assessmentData = doc.data()!;
          
          // Concurrency Check (Atomic server-side)
          if (expectedRevision !== undefined && assessmentData.revision !== expectedRevision) {
            throw new Error('CONCURRENCY_CONFLICT');
          }
          
          // DO NOT increment revision here. Wait until idempotency check.
        } else {
          // Create new assessment
          assessmentData = {
            id: assessmentId,
            studentId: enrollment.studentId,
            enrollmentId,
            classId: cls.id,
            matrixId,
            matrixVersion,
            schoolYear: cls.schoolYear,
            period,
            answers: {},
            answeredCount: 0,
            requiredCount: matrix.criteria.filter((c:any) => c.required).length,
            developedCount: 0,
            inDevelopmentCount: 0,
            completionPercentage: 0,
            status: 'NOT_STARTED',
            revision: 0, // Will be incremented to 1 below
            createdAt: Date.now(),
            updatedAt: Date.now(),
            updatedBy: uid
          };
        }

        // Apply Answer
        const oldAnswer = assessmentData.answers[criterionId] || null;
        
        // Idempotency Check
        if (oldAnswer === answer) {
          return assessmentData; // No actual change, abort transaction silently
        }

        // Apply change and increment revision
        assessmentData.revision = (assessmentData.revision || 0) + 1;

        if (answer === 'D' || answer === 'ED') {
          assessmentData.answers[criterionId] = answer;
        } else if (answer === null) {
          delete assessmentData.answers[criterionId];
        }

        // Recalculate Counters
        let developedCount = 0;
        let inDevelopmentCount = 0;
        let answeredRequiredCount = 0;
        
        for (const [cId, val] of Object.entries(assessmentData.answers)) {
          if (val === 'D') developedCount++;
          if (val === 'ED') inDevelopmentCount++;
          
          const crit = matrix.criteria.find((c: any) => c.id === cId);
          if (crit && crit.required) {
            answeredRequiredCount++;
          }
        }

        assessmentData.developedCount = developedCount;
        assessmentData.inDevelopmentCount = inDevelopmentCount;
        assessmentData.answeredCount = developedCount + inDevelopmentCount;
        
        assessmentData.completionPercentage = assessmentData.requiredCount > 0 
          ? Math.round((answeredRequiredCount / assessmentData.requiredCount) * 100) 
          : 100; // If no required criteria, 100% complete


        if (assessmentData.requiredCount === 0 && assessmentData.answeredCount === 0) {
          assessmentData.status = 'COMPLETED';
        } else if (assessmentData.answeredCount === 0) {
          assessmentData.status = 'NOT_STARTED';
        } else if (answeredRequiredCount >= assessmentData.requiredCount) {
          assessmentData.status = 'COMPLETED';
        } else {
          assessmentData.status = 'IN_PROGRESS';
        }


        assessmentData.updatedAt = Date.now();
        assessmentData.updatedBy = uid;
        
        // SYNC REPORT STATUS
        if (reportDoc.exists) {
          const reportData = reportDoc.data()!;
          if (reportData.assessmentId && reportData.assessmentId !== assessmentId) {
            // The report has been transferred to a different assessment matrix.
            // Do not sync status.
            t.set(assessmentRef, assessmentData);
            return assessmentData;
          }

          const hasContent = !!(reportData.strengths?.trim() || reportData.developmentAspects?.trim() || reportData.additionalInformation?.trim() || reportData.finalText?.trim());
          
          let newReportStatus = 'NOT_STARTED';
          if (hasContent) {
            if (assessmentData.status === 'COMPLETED' && reportData.finalText?.trim()) {
              newReportStatus = 'READY_FOR_REVIEW';
            } else {
              newReportStatus = 'IN_PROGRESS';
            }
          }
          
          let changed = false;

          // Invalidate if it was VALIDATED
          if (reportData.reportStatus === 'VALIDATED') {
            changed = true;
            reportData.reportStatus = newReportStatus;
            delete reportData.validatedBy;
            delete reportData.validatedAt;
            delete reportData.validatedAssessmentRevision;
            delete reportData.validatedMatrixId;
            delete reportData.validatedMatrixVersion;
            
            // Register Audit Log for Invalidation
            const auditRef = db.collection('auditLogs').doc();
            t.set(auditRef, {
              action: 'REPORT_INVALIDATED_BY_ASSESSMENT_CHANGE',
              reportId: reportData.id,
              assessmentId: assessmentData.id,
              changedBy: uid,
              changedAt: Date.now(),
              previousAssessmentRevision: (assessmentData.revision || 1) - 1,
              newAssessmentRevision: assessmentData.revision
            });
          } else if (reportData.reportStatus !== newReportStatus) {
            changed = true;
            reportData.reportStatus = newReportStatus;
          }
          
          if (changed) {
            reportData.revision = (reportData.revision || 0) + 1;
            reportData.updatedAt = Date.now();
            reportData.updatedBy = uid;
            t.set(reportRef, reportData);
          }
        }

        // Set assessment at the end of transaction along with report and audit
        t.set(assessmentRef, assessmentData);

        return assessmentData;
      });
res.json({ success: true, assessment: finalState });
    } catch (e: any) {
      if (e.message === 'CONCURRENCY_CONFLICT') {
        return res.status(409).json({ error: 'Esta avaliação foi atualizada por outro usuário. Recarregue para continuar.' });
      }
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

}
