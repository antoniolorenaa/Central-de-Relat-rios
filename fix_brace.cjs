const fs = require('fs');
let code = fs.readFileSync('src/server-matrices.ts', 'utf8');
code = code.replace("      }\n      });\n\n      const matrixId = uuidv4();", "      }\n\n      const matrixId = uuidv4();");
fs.writeFileSync('src/server-matrices.ts', code);
