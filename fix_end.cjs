const fs = require('fs');
let code = fs.readFileSync('src/pages/Matrices.tsx', 'utf8');

// I need to insert `</>)}` before the very last `</div>`
code = code.replace(/    <\/div>\n  \);\n\}\n?$/, '      </>\n      )}\n    </div>\n  );\n}\n');

fs.writeFileSync('src/pages/Matrices.tsx', code);
