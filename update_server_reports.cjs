const fs = require('fs');
let code = fs.readFileSync('src/server-reports.ts', 'utf8');

// For /save
code = code.replace(
  /if \(\!period \|\| \!enrollmentId \|\| \!assessmentId\) return res\.status\(400\)\.json\(\{ error: 'Parâmetros insuficientes\.' \}\);/,
  `if (!period || !enrollmentId || !assessmentId) return res.status(400).json({ error: 'Parâmetros insuficientes.' });
      
      if (expectedRevision === undefined || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
        return res.status(400).json({ error: 'Revisão esperada não fornecida ou inválida.' });
      }`
);

code = code.replace(
  /if \(expectedRevision !== undefined && reportData\.revision !== expectedRevision\) \{\s*throw new Error\('CONCURRENCY_CONFLICT'\);\s*\}/,
  `if (reportData.revision !== expectedRevision) {
            throw new Error('CONCURRENCY_CONFLICT');
          }`
);

// We should also check for structural differences in /save if the report exists.
code = code.replace(
  /reportData\.matrixVersion = matrixVersion;\s*reportData\.matrixId = actualMatrixId;/g,
  `// Do not change matrix/assessment links on normal save
          if (reportData.assessmentId !== assessmentId || reportData.enrollmentId !== enrollmentId || reportData.period !== period) {
            throw new Error('Vínculos inconsistentes no relatório.');
          }`
);

// We need to also add CONCURRENCY_CONFLICT if expectedRevision !== 0 on creation
code = code.replace(
  /\} else \{\s*reportData = \{/,
  `} else {
          if (expectedRevision !== 0) throw new Error('CONCURRENCY_CONFLICT');
          reportData = {`
);

// Check if there are other structural checks needed in save.

// For /validate
code = code.replace(
  /if \(!Number\.isSafeInteger\(assData\.revision\) \|\| assData\.revision < 0\) \{\s*throw new Error\('Documento de avaliação com campos estruturais ausentes ou inválidos\.'\);\s*\}/,
  `if (!Number.isSafeInteger(assData.revision) || assData.revision < 0) {
          throw new Error('Documento de avaliação com campos estruturais ausentes ou inválidos.');
        }
        if (!reportData.assessmentId) {
          throw new Error('Documento de relatório com campos estruturais ausentes ou inválidos.');
        }`
);

fs.writeFileSync('src/server-reports.ts', code);
