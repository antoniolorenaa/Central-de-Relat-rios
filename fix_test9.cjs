const fs = require('fs');
let code = fs.readFileSync('tests/test-consolidated.ts', 'utf8');

code = code.replace(
  /db\.store\.set\('assessments\/ass1', \{ id: 'ass1', answers: \{\} \}\);/g,
  `db.store.set('assessments/ass1', { id: 'ass1', status: 'COMPLETED', answers: {} });`
);

fs.writeFileSync('tests/test-consolidated.ts', code);
