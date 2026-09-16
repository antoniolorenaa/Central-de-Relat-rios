const fs = require('fs');
let code = fs.readFileSync('src/pages/Matrices.tsx', 'utf8');

const target = "                <X className=\"w-5 h-5\" />\n              </button>\n            </div>";
const replacement = "                <X className=\"w-5 h-5\" />\n              </button>\n              </div>\n            </div>";

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/pages/Matrices.tsx', code);
}
