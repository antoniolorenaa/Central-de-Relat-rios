const fs = require('fs');
let code = fs.readFileSync('src/pages/Matrices.tsx', 'utf8');

// Add ConfirmModal to imports
code = code.replace(/import \{ Button \} from '\.\.\/components\/ui\/Button';/, `import { Button } from '../components/ui/Button';\nimport { ConfirmModal } from '../components/ui/ConfirmModal';`);

// Add lucide-react Trash2
code = code.replace(/import \{ Loader2, Plus, Upload, CheckCircle, FileText, AlertCircle, Archive \} from 'lucide-react';/, `import { Loader2, Plus, Upload, CheckCircle, FileText, AlertCircle, Archive, Trash2 } from 'lucide-react';`);

// Add state for delete
code = code.replace(/const \[confirmPublishId, setConfirmPublishId\] = useState<string \| null>\(null\);/, `const [confirmPublishId, setConfirmPublishId] = useState<string | null>(null);\n  const [matrixToDelete, setMatrixToDelete] = useState<any>(null);\n  const [isDeleting, setIsDeleting] = useState(false);`);

// Add delete function
const deleteFunc = `
  const handleDeleteMatrix = async () => {
    if (!matrixToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(\`/api/admin/matrices/\${matrixToDelete.id}\`, {
        method: 'DELETE',
        headers: { Authorization: \`Bearer \${token}\` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir');
      
      setMatrices(prev => prev.filter(m => m.id !== matrixToDelete.id));
      setMatrixToDelete(null);
    } catch(err: any) {
      setError(err.message);
      setMatrixToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };
`;

code = code.replace(/const fetchMeta = async \(\) => \{/, deleteFunc + '\n  const fetchMeta = async () => {');

const btnRegex = /(<Button className="bg-green-600 hover:bg-green-700 whitespace-nowrap" onClick={\(\) => publishMatrix\(matrix\.id\)}>\n\s+Confirmar Publicação\n\s+<\/Button>\n\s+<\/div>\n\s+\)}\n)/;
const deleteBtn = `$1
                        {matrix.status === 'DRAFT' && confirmPublishId !== matrix.id && (
                          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 whitespace-nowrap ml-2" onClick={() => setMatrixToDelete(matrix)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir rascunho
                          </Button>
                        )}
`;
code = code.replace(btnRegex, deleteBtn);

const modalCode = `
      <ConfirmModal
        isOpen={!!matrixToDelete}
        title="Excluir Rascunho"
        message={matrixToDelete ? \`Deseja realmente excluir o rascunho da matriz "\${meta.gradeLevels?.find((g: any) => g.id === matrixToDelete.gradeLevelId)?.name || matrixToDelete.gradeLevelId}" (Ano: \${matrixToDelete.schoolYear}, Período: \${matrixToDelete.period}, Marca: \${meta.brands?.find((b: any) => b.id === matrixToDelete.brandId)?.name || matrixToDelete.brandId}, Programa: \${meta.programs?.find((p: any) => p.id === matrixToDelete.programId)?.name || matrixToDelete.programId})?\` : ''}
        confirmText={isDeleting ? "Excluindo..." : "Sim, Excluir"}
        cancelText="Cancelar"
        onConfirm={handleDeleteMatrix}
        onCancel={() => {
          if (!isDeleting) setMatrixToDelete(null);
        }}
      />
    </div>
  );
}
`;

code = code.replace(/<\/div>\n\s+<\/div>\n\s+\);\n\}/, '      </div>\n' + modalCode);

fs.writeFileSync('src/pages/Matrices.tsx', code);
