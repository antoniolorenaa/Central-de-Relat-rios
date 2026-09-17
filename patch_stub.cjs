const fs = require('fs');
let code = fs.readFileSync('src/server-assessments.ts', 'utf8');

const targetIfReport = `        // SYNC REPORT STATUS
        if (reportDoc.exists) {
          const reportData = reportDoc.data()!;
          currentReportData = reportData;`;

const newIfReport = `        // SYNC REPORT STATUS
        if (reportDoc.exists) {
          const reportData = reportDoc.data()!;
          currentReportData = reportData;`;

const targetEndTransaction = `        // Set assessment at the end of transaction along with report and audit
        t.set(assessmentRef, assessmentData);

        return assessmentData;
      });`;

const newEndTransaction = `        if (!reportDoc.exists && justCompleted) {
          currentReportData = {
            id: reportId,
            studentId: enrollment.studentId,
            enrollmentId,
            classId: cls.id,
            assessmentId,
            matrixId,
            matrixVersion,
            schoolYear: cls.schoolYear,
            period,
            strengths: '',
            developmentAspects: '',
            additionalInformation: '',
            finalText: '',
            reportStatus: 'IN_PROGRESS',
            revision: 0,
            createdAt: Date.now(),
            createdBy: uid
          };
        }

        // Set assessment at the end of transaction along with report and audit
        t.set(assessmentRef, assessmentData);

        return assessmentData;
      });`;

code = code.replace(targetEndTransaction, newEndTransaction);
fs.writeFileSync('src/server-assessments.ts', code);
