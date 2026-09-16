const fs = require('fs');
let code = fs.readFileSync('src/pages/Matrices.tsx', 'utf8');

console.log(code.slice(code.length - 200));
