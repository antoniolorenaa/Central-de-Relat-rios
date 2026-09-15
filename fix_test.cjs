const fs = require('fs');
let code = fs.readFileSync('tests/test-consolidated.ts', 'utf8');

code = code.replace(/const fs = require\('fs'\);/, "const fs = await import('fs');");

fs.writeFileSync('tests/test-consolidated.ts', code);
