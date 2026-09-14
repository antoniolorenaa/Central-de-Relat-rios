const fs = require('fs');
let code = fs.readFileSync('tests/test-consolidated.ts', 'utf8');

code = code.replace(
  /assert\.strictEqual\(statusCode, 200, JSON\.stringify\(responseData\)\);/g,
  `if (statusCode !== 200) console.error(responseData); assert.strictEqual(statusCode, 200);`
);

fs.writeFileSync('tests/test-consolidated.ts', code);
