const fs = require('fs');
let code = fs.readFileSync('src/server-reports.ts', 'utf8');

// 1. In /save route:
// Require expectedRevision as safe integer >= 0 (unless creating, when expectedRevision is 0)
// The client sends expectedRevision for save.
// Wait, for creation, what does client send? It sends 0.
// If missing/invalid, return 400.
code = code.replace(
  /if \(expectedRevision !== undefined && reportData\.revision !== expectedRevision\) \{\s*throw new Error\('CONCURRENCY_CONFLICT'\);\s*\}/,
  `if (expectedRevision === undefined || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
            throw new Error('Revisão esperada não fornecida ou inválida.');
          }
          if (reportData.revision !== expectedRevision) {
            throw new Error('CONCURRENCY_CONFLICT');
          }`
);

// We need to also do this in the else block if creating:
code = code.replace(
  /\} else \{\s*\/\/ Criação do relatório/,
  `} else {
          // Criação do relatório
          if (expectedRevision !== 0 && expectedRevision !== undefined) {
             throw new Error('CONCURRENCY_CONFLICT');
          }`
);

// Actually let's just do a string replacement for the transaction in /save
// I'll extract the block.
