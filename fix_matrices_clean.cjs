const fs = require('fs');
let code = fs.readFileSync('src/pages/Matrices.tsx', 'utf8');

const replacement = "if (editingMatrix) {\n" +
"    return (\n" +
"      <MatrixEditor \n" +
"        matrix={editingMatrix} \n" +
"        meta={meta} \n" +
"        onCancel={() => setEditingMatrix(null)} \n" +
"        onSaveSuccess={() => { setEditingMatrix(null); fetchMatrices(); }} \n" +
"        onConflict={(draftId) => { \n" +
"          const existingDraft = matrices.find(m => m.id === draftId);\n" +
"          if (existingDraft) setEditingMatrix(existingDraft);\n" +
"          else fetchMatrices().then(() => {\n" +
"             const fn = async () => {\n" +
"               const token = await user?.getIdToken();\n" +
"               const r = await fetch('/api/admin/matrices', { headers: { Authorization: `Bearer ${token}` } });\n" +
"               const d = await r.json();\n" +
"               setMatrices(d.matrices || []);\n" +
"               setEditingMatrix(d.matrices.find((m: any) => m.id === draftId) || null);\n" +
"             };\n" +
"             fn();\n" +
"          });\n" +
"        }} \n" +
"      />\n" +
"    );\n" +
"  }\n" +
"\n" +
"  return (\n" +
"    <div className=\"space-y-6 max-w-7xl mx-auto\">";

code = code.replace(/return \(\n    <div className="space-y-6 max-w-7xl mx-auto">\n      \{editingMatrix \? \([\s\S]*?            \}\)\;\n           \}\}\ \n        \/>\n      \) : \(\n        <>\n/, replacement);

code = code.replace(/      \)\}\n      <\/>\n      \)\}\n    <\/div>\n  \);\n\}/, "      )}\n    </div>\n  );\n}");

fs.writeFileSync('src/pages/Matrices.tsx', code);
