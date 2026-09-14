const fs = require('fs');
let code = fs.readFileSync('src/server-reports.ts', 'utf8');
console.log(code.split("app.post('/api/academic/reports/:reportId'")[1].substring(0, 800));
