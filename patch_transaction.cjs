const fs = require('fs');
let code = fs.readFileSync('src/server-assessments.ts', 'utf8');

const oldTransaction = `
      const finalState = await db.runTransaction(async (t) => {
        const doc = await t.get(assessmentRef);
        let assessmentData: any;

        if (doc.exists) {
          assessmentData = doc.data()!;
          
          // Concurrency Check (Atomic server-side)
          if (expectedRevision !== undefined && assessmentData.revision !== expectedRevision) {
            throw new Error('CONCURRENCY_CONFLICT');
          }
          
          assessmentData.revision = (assessmentData.revision || 0) + 1;
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
            revision: 1,
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
          // If there are no required criteria, it is effectively COMPLETED by default, 
          // but we might want to let the teacher at least interact with it. 
          // Actually, the user requested: "sem depender acidentalmente de preencher ou limpar um opcional."
          // So if requiredCount is 0, it should be COMPLETED even with 0 answers.
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
        t.set(assessmentRef, assessmentData);

        // SYNC REPORT STATUS
        const reportId = \`rep_\${enrollmentId}_\${period}\`;
        const reportRef = db.collection('reports').doc(reportId);
        const reportDoc = await t.get(reportRef);
        
        
        if (reportDoc.exists) {
          const reportData = reportDoc.data();
          if (reportData.assessmentId && reportData.assessmentId !== assessmentId) {
            // The report has been transferred to a different assessment matrix.
            // Do not sync status.
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

        return assessmentData;
      });
`;

const newTransaction = `
      const reportId = \`rep_\${enrollmentId}_\${period}\`;
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
`;

if (code.includes('const finalState = await db.runTransaction(async (t) => {')) {
  // It's a bit risky to string-replace such a large block, let's use a simpler replace
  // or indexOf.
  const startIndex = code.indexOf('const finalState = await db.runTransaction(async (t) => {');
  // End index is where the block ends, which is just before `res.json({ success: true, assessment: finalState });`
  const endIndex = code.indexOf('res.json({ success: true, assessment: finalState });');
  if (startIndex !== -1 && endIndex !== -1) {
    const before = code.substring(0, startIndex);
    const after = code.substring(endIndex);
    code = before + newTransaction + after;
    fs.writeFileSync('src/server-assessments.ts', code);
    console.log("Patched successfully");
  } else {
    console.log("Could not find boundaries");
  }
} else {
  console.log("Transaction start not found");
}

