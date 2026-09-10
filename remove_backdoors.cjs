const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// The injected code started with app.get('/api/test-db' and app.get('/api/fix-db'
// Let's just use regex to remove them cleanly.
code = code.replace(/  app\.get\('\/api\/test-db'[\s\S]*?\}\);\n/g, '');
code = code.replace(/  app\.get\('\/api\/fix-db'[\s\S]*?\}\);\n/g, '');

fs.writeFileSync('server.ts', code);
