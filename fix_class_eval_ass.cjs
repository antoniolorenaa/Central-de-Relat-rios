const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

// Replace in handleAnswer
code = code.replace(
  /const currentAss = assessments\.find\(\(a\) => a\.enrollmentId === enrollmentId\);/,
  `const __stu = students.find(s => s.enrollment.id === enrollmentId);
    const currentAss = __stu ? getAssessment(__stu.id) : null;`
);

code = code.replace(
  /const idx = copy\.findIndex\(\(a\) => a\.enrollmentId === enrollmentId\);/g,
  `const idx = currentAss ? copy.findIndex(a => a.id === currentAss.id) : -1;`
);

// Replace in saveReportNow
code = code.replace(
  /const currentAss = assessments\.find\(\s*\n?\s*\(a\) => a\.enrollmentId === selectedStudent\.enrollment\.id,?\s*\n?\s*\);/,
  `const currentAss = getAssessment(selectedStudent.id);`
);

// Replace in handleValidateReport
code = code.replace(
  /const currentAss = assessments\.find\(\s*\n?\s*\(a\) => a\.enrollmentId === selectedStudent\.enrollment\.id,?\s*\n?\s*\);/,
  `const currentAss = getAssessment(selectedStudent.id);`
);

// Replace in handleReopenReport
code = code.replace(
  /const currentAss = assessments\.find\(\s*\n?\s*\(a\) => a\.enrollmentId === selectedStudent\.enrollment\.id,?\s*\n?\s*\);/,
  `const currentAss = getAssessment(selectedStudent.id);`
);

// Replace in handleTransfer
code = code.replace(
  /const currentAss = assessments\.find\(\s*\n?\s*\(a\) => a\.enrollmentId === selectedStudent\.enrollment\.id,?\s*\n?\s*\);/,
  `const currentAss = getAssessment(selectedStudent.id);`
);

fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
