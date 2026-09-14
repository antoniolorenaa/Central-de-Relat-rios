const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

if(code.includes("body: JSON.stringify({")) {
   console.log("Found body.");
}
