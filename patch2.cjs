const fs = require('fs');
let code = fs.readFileSync('src/server-assessments.ts', 'utf8');

const regex = /assessmentData\.updatedAt = Date\.now\(\);[\s\S]*?assessmentData\.updatedBy = uid;[\s\S]*?t\.set\(assessmentRef, assessmentData\);[\s\S]*?return assessmentData;/;

const replacement = `assessmentData.updatedAt = Date.now();
        assessmentData.updatedBy = uid;
        t.set(assessmentRef, assessmentData);

        // SYNC REPORT STATUS
        const reportId = \`rep_\${assessmentId}\`;
        const reportRef = db.collection('reports').doc(reportId);
        const reportDoc = await t.get(reportRef);
        
        if (reportDoc.exists) {
          const reportData = reportDoc.data();
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

        return assessmentData;`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/server-assessments.ts', code);
  console.log('Successfully replaced using regex');
} else {
  console.log('Regex did not match');
}
