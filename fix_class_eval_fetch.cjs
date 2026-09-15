const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

code = code.replace(
  /const fetchData = async \(\) => \{/,
  `const fetchData = async (preserveSelection: boolean = false) => {`
);

code = code.replace(
  /setStudents\(\[\]\);\s*setAssessments\(\[\]\);\s*setSelectedStudentId\(null\);/,
  `if (!preserveSelection) { setStudents([]); setAssessments([]); setSelectedStudentId(null); }`
);

code = code.replace(
  /if \(sortedStudents\.length > 0\) \{\s*setSelectedStudentId\(sortedStudents\[0\]\.id\);\s*\}/,
  `if (sortedStudents.length > 0 && (!preserveSelection || !selectedStudentId)) { setSelectedStudentId(sortedStudents[0].id); }`
);

// In saveReportNow, handle 409
code = code.replace(
  /setSavingError\(data\.error\);\s*setSavingState\("error"\);\s*fetchData\(\);/,
  `setSavingError(data.error || "Conflito de edição detectado."); setSavingState("error"); fetchData(true);`
);

fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
