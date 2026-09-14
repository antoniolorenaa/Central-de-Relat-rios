const fs = require('fs');
let code = fs.readFileSync('tests/test-consolidated.ts', 'utf8');
code = code.replace(
  /db\.store\.set\('matrices\/mat_new', \{ version: 5, criteria: \[\{ id: 'c1', required: true \}\] \}\);/,
  `db.store.set('matrices/mat_new', { status: 'PUBLISHED', schoolYear: '2026', period: 'T1', gradeLevelId: 'grade1', brandId: 'GLOBAL', programId: 'ALL', version: 5, criteria: [{ id: 'c1', required: true }] });`
);
fs.writeFileSync('tests/test-consolidated.ts', code);
