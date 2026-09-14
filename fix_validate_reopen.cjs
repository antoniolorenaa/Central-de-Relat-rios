const fs = require('fs');
let code = fs.readFileSync('src/server-reports.ts', 'utf8');

// For /validate
code = code.replace(
  /const \{ period, enrollmentId, assessmentId, expectedRevision, strengths, developmentAspects, additionalInformation, finalText \} = req\.body;/,
  `const { period, enrollmentId, assessmentId, expectedRevision, strengths, developmentAspects, additionalInformation, finalText } = req.body;
      
      if (expectedRevision === undefined || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
        return res.status(400).json({ error: 'Revisão esperada não fornecida ou inválida.' });
      }`
);
code = code.replace(
  /if \(expectedRevision !== undefined && reportData\.revision !== expectedRevision\) \{\s*throw new Error\('CONCURRENCY_CONFLICT'\);\s*\}/g,
  `if (reportData.revision !== expectedRevision) {
            throw new Error('CONCURRENCY_CONFLICT');
          }`
);

// For /reopen
code = code.replace(
  /const \{ period, enrollmentId, assessmentId, expectedRevision \} = req\.body;/,
  `const { period, enrollmentId, assessmentId, expectedRevision } = req.body;
      
      if (expectedRevision === undefined || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
        return res.status(400).json({ error: 'Revisão esperada não fornecida ou inválida.' });
      }`
);

fs.writeFileSync('src/server-reports.ts', code);
