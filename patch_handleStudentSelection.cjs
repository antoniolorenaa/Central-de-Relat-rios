const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

code = code.replace(
  /const handleStudentSelection = \(newStudentId: string\) => \{/,
  `const handleStudentSelection = (newStudentId: string) => {
    if (reportSaveTimeoutRef.current) clearTimeout(reportSaveTimeoutRef.current);
    saveTokenRef.current++;`
);

fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
