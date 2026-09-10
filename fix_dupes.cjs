const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

const regex = /const currentAss = assessments\.find\(a => a\.enrollmentId === selectedStudent\.enrollment\.id\);\s*const assessmentId = currentAss\?\.id \|\| \`ass_\$\{selectedStudent\.enrollment\.id\}_\$\{stuMatrix\?\.id\}_\$\{period\}\`;\s*const reportId = selectedReport\?\.id \|\| \`rep_\$\{assessmentId\}\`;\s*payload\.assessmentId = assessmentId;/g;

code = code.replace(regex, "");

fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
