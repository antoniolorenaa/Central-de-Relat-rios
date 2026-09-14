const fs = require('fs');
let code = fs.readFileSync('tests/test-consolidated.ts', 'utf8');

// Fix setup to include revision: 1 for ass1
code = code.replace(
  /status: 'COMPLETED', answers: \{\} \}\);/g,
  `status: 'COMPLETED', revision: 1, answers: {} });`
);

// Fix Test 9 audit action name
code = code.replace(
  /val\.action === 'VALIDATE_REPORT'/g,
  `val.action === 'REPORT_VALIDATED'`
);

// Fix Test 11 audit action name and status
code = code.replace(
  /val\.action === 'REOPEN_REPORT'/g,
  `val.action === 'REPORT_REOPENED'`
);
code = code.replace(
  /assert\.strictEqual\(report\.reportStatus, 'IN_PROGRESS'\);/g,
  `assert.strictEqual(report.reportStatus, 'READY_FOR_REVIEW');`
);

// Fix Test 17 audit action name
code = code.replace(
  /val\.action === 'TRANSFER_REPORT'/g,
  `val.action === 'REPORT_TRANSFERRED'`
);

fs.writeFileSync('tests/test-consolidated.ts', code);
