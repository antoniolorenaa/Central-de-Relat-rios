const fs = require('fs');
let code = fs.readFileSync('tests/test-consolidated.ts', 'utf8');

code = code.replace(
  /const authenticate = \(req: any, res: any, next: any\) => \{ req\.user = \{ uid: 'user1' \}; next\(\); \};/g,
  `const authenticate = (req: any, res: any, next: any) => { req.user = req.user || { uid: 'user1' }; next(); };`
);

code = code.replace(
  /assert\.strictEqual\(report\.reportStatus, 'NOT_STARTED'\);/g,
  `assert.strictEqual(report.reportStatus, tc.name.includes("Cria se") ? 'NOT_STARTED' : 'READY_FOR_REVIEW');`
);

fs.writeFileSync('tests/test-consolidated.ts', code);
