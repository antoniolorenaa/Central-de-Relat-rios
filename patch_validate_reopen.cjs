const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

// Patch handleValidateReport
code = code.replace(
  /if \(!res\.ok\) \{\s*if \(res\.status === 409\) fetchData\(\);\s*throw new Error\(data\.error \|\| "Erro ao validar relatório"\);\s*\}/,
  `if (!res.ok) {
            if (res.status === 409) {
              setSavingError(data.error || "Conflito de edição detectado.");
              setSavingState("error");
              fetchData(true);
              return;
            }
            throw new Error(data.error || "Erro ao validar relatório");
          }`
);

// Patch handleReopenReport
code = code.replace(
  /if \(!res\.ok\) \{\s*if \(res\.status === 409\) fetchData\(\);\s*throw new Error\(data\.error \|\| "Erro ao reabrir"\);\s*\}/,
  `if (!res.ok) {
            if (res.status === 409) {
              setSavingError(data.error || "Conflito de edição detectado.");
              setSavingState("error");
              fetchData(true);
              return;
            }
            throw new Error(data.error || "Erro ao reabrir");
          }`
);

fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
