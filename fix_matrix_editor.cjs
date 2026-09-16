const fs = require('fs');
let code = fs.readFileSync('src/components/MatrixEditor.tsx', 'utf8');

// The error says "Invalid character" at line 94, 18.
// Let's check what is there.
// \`/api/admin/matrices/\${matrix.id}\`
// Because I passed it via cat << 'EOF' and used \`, I need to make sure bash didn't evaluate it. But I used 'EOF' so bash doesn't evaluate.
// Wait, I used \` inside the 'EOF' but I didn't need to escape the backticks? Or maybe I did escape them and they were preserved?
// If I wrote \` in cat << 'EOF', it literally writes \` into the file.
code = code.replace(/\\`/g, '`');
code = code.replace(/\\\$/g, '$');
fs.writeFileSync('src/components/MatrixEditor.tsx', code);
