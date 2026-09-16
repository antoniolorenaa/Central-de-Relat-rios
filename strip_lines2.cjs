const fs = require('fs');
let code = fs.readFileSync('src/pages/Matrices.tsx', 'utf8');
const lines = code.split('\n');

const newLines = [...lines.slice(0, 162), ...lines.slice(163)];

fs.writeFileSync('src/pages/Matrices.tsx', newLines.join('\n'));
