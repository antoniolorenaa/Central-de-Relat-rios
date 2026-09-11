const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

// There's a bug in how we replace
let idx = code.indexOf("          copy.push(data.assessment);\n          return copy;\n      });");
if (idx !== -1) {
  code = code.substring(0, idx) + "          copy.push(data.assessment);\n        }\n        return copy;\n      });" + code.substring(idx + 70);
}
fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
