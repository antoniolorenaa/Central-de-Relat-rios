const fs = require('fs');
let code = fs.readFileSync('src/server-assessments.ts', 'utf8');

const target = `
            // Register Audit Log for Invalidation
            const auditRef = db.collection('auditLogs').doc();
            t.set(auditRef, {
              action: 'REPORT_INVALIDATED_BY_ASSESSMENT_CHANGE',
              reportId: reportData.id,
              studentId: reportData.studentId,
              classId: reportData.classId,
              uid,
              timestamp: Date.now(),
              previousAssessmentRevision: (assessmentData.revision || 1) - 1,
              newAssessmentRevision: assessmentData.revision
            });
`;

const replacement = `
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
`;

code = code.replace(target, replacement);

fs.writeFileSync('src/server-assessments.ts', code);
