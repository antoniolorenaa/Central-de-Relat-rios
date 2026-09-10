const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

// Inside saveReportNow
code = code.replace(
  `const token = await user?.getIdToken();
      
      payload.enrollmentId = selectedStudent.enrollment.id;
      const res = await fetch(\`/api/academic/reports/\${reportId}\`, {`,
  `const token = await user?.getIdToken();
      
      const currentAss = assessments.find(a => a.enrollmentId === selectedStudent.enrollment.id);
      const assessmentId = currentAss?.id || \`ass_\${selectedStudent.enrollment.id}_\${stuMatrix?.id}_\${period}\`;
      const reportId = selectedReport?.id || \`rep_\${assessmentId}\`;
      payload.assessmentId = assessmentId;
      payload.enrollmentId = selectedStudent.enrollment.id;
      
      const res = await fetch(\`/api/academic/reports/\${reportId}\`, {`
);

// Inside handleReportChange
code = code.replace(
  `const token = await user?.getIdToken();
        
        payload.enrollmentId = selectedStudent.enrollment.id;
        const res = await fetch(\`/api/academic/reports/\${reportId}\`, {`,
  `const token = await user?.getIdToken();
        
        const currentAss = assessments.find(a => a.enrollmentId === selectedStudent.enrollment.id);
        const assessmentId = currentAss?.id || \`ass_\${selectedStudent.enrollment.id}_\${stuMatrix?.id}_\${period}\`;
        const reportId = selectedReport?.id || \`rep_\${assessmentId}\`;
        payload.assessmentId = assessmentId;
        payload.enrollmentId = selectedStudent.enrollment.id;
        
        const res = await fetch(\`/api/academic/reports/\${reportId}\`, {`
);

// Inside handleValidateReport, let's make sure it's clean
const validateTarget = `      const token = await user?.getIdToken();
      
      const currentAss = assessments.find(a => a.enrollmentId === selectedStudent.enrollment.id);
      const assessmentId = currentAss?.id || \`ass_\${selectedStudent.enrollment.id}_\${stuMatrix?.id}_\${period}\`;
      const reportId = selectedReport?.id || \`rep_\${assessmentId}\`;
      const payload = { 
        enrollmentId: selectedStudent.enrollment.id,
        assessmentId,
        period, 
        expectedRevision: selectedReport?.revision,`;

code = code.replace(validateTarget, validateTarget); // no-op if already clean, just to verify format. 

fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
