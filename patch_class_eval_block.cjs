const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

const blockCheck = `if (isAssessmentInconsistent) return;`;

code = code.replace(/const saveReportNow = async \(\) => \{/g, `$& ${blockCheck}`);
code = code.replace(/const handleValidateReport = async \(\) => \{/g, `$& ${blockCheck}`);
code = code.replace(/const handleAnswer = async \(enrollmentId: string, criterionId: string, answer: any\) => \{/g, `$& if (isAssessmentInconsistent) return;`);

fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
