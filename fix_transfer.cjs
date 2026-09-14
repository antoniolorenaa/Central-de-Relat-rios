const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

code = code.replace(
  /newMatrixId: activeMatrix\.id,\s*\n\s*newMatrixVersion: activeMatrix\.version,/,
  "newMatrixId: activeMatrix.id,\n                expectedRevision: selectedReport?.revision,"
);

code = code.replace(
  /const handleTransferMatrix = async \(\) => \{\s*\n\s*if \(\!selectedStudent \|\| \!activeMatrix\) return;/,
  `const handleTransferMatrix = async () => {
    if (!selectedStudent || !activeMatrix) return;
    
    if (!selectedReport || typeof selectedReport.revision !== 'number') {
      setSavingError("O relatório precisa estar salvo (com revisão válida) antes de ser transferido. Salve alguma alteração primeiro.");
      setSavingState("error");
      return;
    }`
);

fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
