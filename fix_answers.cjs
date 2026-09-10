const fs = require('fs');
let code = fs.readFileSync('src/server-assessments.ts', 'utf8');

// Inside /answers:
// if (reportDoc.exists) {
//   const reportData = reportDoc.data();
//   if (reportData.assessmentId !== assessmentId) { return reportData; // or something }

const replacement = `
        if (reportDoc.exists) {
          const reportData = reportDoc.data();
          if (reportData.assessmentId && reportData.assessmentId !== assessmentId) {
            // The report has been transferred to a different assessment matrix.
            // Do not sync status.
            return assessmentData;
          }
`;

code = code.replace(
  "if (reportDoc.exists) {\n          const reportData = reportDoc.data();",
  replacement
);

fs.writeFileSync('src/server-assessments.ts', code);
