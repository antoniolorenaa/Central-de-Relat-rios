const fs = require('fs');
let code = fs.readFileSync('src/pages/Users.tsx', 'utf8');

code = code.replace(
  /console\.error\(err\);\s*\n\s*alert\("Erro ao atualizar status"\);/,
  `setActionError(err instanceof Error ? err.message : "Erro ao atualizar status");`
);

fs.writeFileSync('src/pages/Users.tsx', code);
