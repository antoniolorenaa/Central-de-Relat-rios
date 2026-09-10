const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

code = code.replace(
  "payload.assessmentId = assessmentId;",
  "(payload as any).assessmentId = assessmentId;"
);
code = code.replace(
  "payload.enrollmentId = selectedStudent.enrollment.id;",
  "(payload as any).enrollmentId = selectedStudent.enrollment.id;"
);
fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
