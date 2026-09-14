const fs = require('fs');
let code = fs.readFileSync('src/pages/Users.tsx', 'utf8');

code = code.replace(
  /<p className="text-gray-500 mt-1">Gerencie os acessos à plataforma\.<\/p>\s*\n\s*<\/div>/,
  `<p className="text-gray-500 mt-1">Gerencie os acessos à plataforma.</p>\n        </div>`
);

code = code.replace(
  /<Button onClick=\{openNew\}>/,
  `{actionError && <div className="text-red-600 bg-red-50 p-2 rounded text-sm mb-4">{actionError}</div>}\n        <Button onClick={openNew}>`
);

fs.writeFileSync('src/pages/Users.tsx', code);
