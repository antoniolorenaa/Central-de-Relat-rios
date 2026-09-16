const fs = require('fs');
let code = fs.readFileSync('src/pages/Matrices.tsx', 'utf8');

const importEditor = `import { MatrixEditor } from '../components/MatrixEditor';`;
if (!code.includes('MatrixEditor')) {
  code = code.replace(`import { ConfirmModal }`, `import { MatrixEditor } from '../components/MatrixEditor';\nimport { ConfirmModal }`);
}

if (!code.includes('editingMatrix')) {
  code = code.replace(`const [viewingMatrix, setViewingMatrix] = useState<Matrix | null>(null);`, `const [viewingMatrix, setViewingMatrix] = useState<Matrix | null>(null);\n  const [editingMatrix, setEditingMatrix] = useState<Matrix | null>(null);`);
}

// 1. Add "Editar matriz" button in the matrix card
const searchCardBtns = `<Button variant="outline" className="text-gray-600 border-gray-200 hover:bg-gray-50 whitespace-nowrap" onClick={() => setViewingMatrix(matrix)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver critérios
                        </Button>`;
const replaceCardBtns = `<Button variant="outline" className="text-gray-600 border-gray-200 hover:bg-gray-50 whitespace-nowrap" onClick={() => setViewingMatrix(matrix)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver critérios
                        </Button>
                        {profile?.role === 'MASTER' && (
                          <Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 whitespace-nowrap" onClick={() => setEditingMatrix(matrix)}>
                            Editar matriz
                          </Button>
                        )}`;
if (!code.includes('Editar matriz')) {
  code = code.replace(searchCardBtns, replaceCardBtns);

  // 2. Add "Editar matriz" button in the visualization modal
  const searchModalHeader = `</p>
              </div>
              <button onClick={() => setViewingMatrix(null)} className="text-gray-400 hover:text-gray-600 rounded-full p-2 hover:bg-gray-200 transition-colors">`;
  const replaceModalHeader = `</p>
              </div>
              <div className="flex items-center gap-3">
                {profile?.role === 'MASTER' && (
                  <Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 whitespace-nowrap" onClick={() => { setEditingMatrix(viewingMatrix); setViewingMatrix(null); }}>
                    Editar matriz
                  </Button>
                )}
                <button onClick={() => setViewingMatrix(null)} className="text-gray-400 hover:text-gray-600 rounded-full p-2 hover:bg-gray-200 transition-colors">`;
  code = code.replace(searchModalHeader, replaceModalHeader);

  // 3. Conditional render in the main return
  const searchReturn = `return (
    <div className="space-y-6 max-w-7xl mx-auto">`;
  const replaceReturn = `return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {editingMatrix ? (
        <MatrixEditor 
          matrix={editingMatrix} 
          meta={meta} 
          onCancel={() => setEditingMatrix(null)} 
          onSaveSuccess={() => { setEditingMatrix(null); fetchMatrices(); }} 
          onConflict={(draftId) => { 
            const existingDraft = matrices.find(m => m.id === draftId);
            if (existingDraft) setEditingMatrix(existingDraft);
            else fetchMatrices().then(() => {
               // need to find it again after fetch
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
      ) : (
        <>`;
  code = code.replace(searchReturn, replaceReturn);

  const searchEnd = `</Card>
        </div>
      
      </div>`;
  const replaceEnd = `</Card>
        </div>
      
      </div>
      </>
      )}`;
  code = code.replace(searchEnd, replaceEnd);
}

fs.writeFileSync('src/pages/Matrices.tsx', code);
