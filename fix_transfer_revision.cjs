const fs = require('fs');
let code = fs.readFileSync('src/server-reports.ts', 'utf8');

code = code.replace(
  "const { enrollmentId, period, newMatrixId, newMatrixVersion } = req.body;",
  "const { enrollmentId, period, newMatrixId, newMatrixVersion, expectedRevision } = req.body;"
);

code = code.replace(
  "const reportData = doc.data();",
  "const reportData = doc.data();\n\n        if (expectedRevision !== undefined && reportData.revision !== expectedRevision) {\n          throw new Error('CONCURRENCY_CONFLICT');\n        }"
);

fs.writeFileSync('src/server-reports.ts', code);
