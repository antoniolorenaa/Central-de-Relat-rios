const fs = require('fs');
let code = fs.readFileSync('src/pages/Matrices.tsx', 'utf8');
const lines = code.split('\n');

// we remove lines 165 to 188
const newLines = [...lines.slice(0, 163),
`  if (editingMatrix) {
    return (
      <MatrixEditor 
        matrix={editingMatrix} 
        meta={meta} 
        onCancel={() => setEditingMatrix(null)} 
        onSaveSuccess={() => { setEditingMatrix(null); fetchMatrices(); }} 
        onConflict={(draftId) => { 
          const existingDraft = matrices.find(m => m.id === draftId);
          if (existingDraft) setEditingMatrix(existingDraft);
          else fetchMatrices().then(() => {
             const fn = async () => {
               const token = await user?.getIdToken();
               const r = await fetch('/api/admin/matrices', { headers: { Authorization: \`Bearer \${token}\` } });
               const d = await r.json();
               setMatrices(d.matrices || []);
               setEditingMatrix(d.matrices.find((m: any) => m.id === draftId) || null);
             };
             fn();
          });
        }} 
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">`,
...lines.slice(188)];

let nextCode = newLines.join('\n');
nextCode = nextCode.replace(/      \)\}\n      <\/>\n      \)\}\n    <\/div>\n  \);\n\}/, "      )}\n    </div>\n  );\n}");

fs.writeFileSync('src/pages/Matrices.tsx', nextCode);
