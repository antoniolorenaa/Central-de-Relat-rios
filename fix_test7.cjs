const fs = require('fs');
let code = fs.readFileSync('tests/test-consolidated.ts', 'utf8');

code = code.replace(
  /assert\.strictEqual\(statusCode, 200\);/g,
  `assert.strictEqual(statusCode, 200, JSON.stringify(responseData));`
);

fs.writeFileSync('tests/test-consolidated.ts', code);
