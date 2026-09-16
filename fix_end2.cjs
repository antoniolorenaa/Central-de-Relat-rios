const fs = require('fs');
let code = fs.readFileSync('src/pages/Matrices.tsx', 'utf8');

const target = '      )}\n    </div>\n  );\n}';
if (code.includes(target)) {
  code = code.replace(target, '      )}\n      </>\n      )}\n    </div>\n  );\n}');
  fs.writeFileSync('src/pages/Matrices.tsx', code);
} else {
  console.log("NOT FOUND");
}
