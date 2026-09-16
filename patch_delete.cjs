const fs = require('fs');
let code = fs.readFileSync('src/pages/Matrices.tsx', 'utf8');

// We add the states
if (!code.includes('deleteImpact')) {
  code = code.replace(`const [matrixToDelete, setMatrixToDelete] = useState<Matrix | null>(null);`, `const [matrixToDelete, setMatrixToDelete] = useState<Matrix | null>(null);\n  const [deleteImpact, setDeleteImpact] = useState<any>(null);\n  const [isLoadingImpact, setIsLoadingImpact] = useState(false);`);
}

// Replace handleDeleteMatrix
const deleteFunction = `const fetchDeleteImpact = async (matrixId: string) => {
    setIsLoadingImpact(true);
    setDeleteImpact(null);
    setDeleteError('');
    try {
      const token = await user?.getIdToken();
      const res = await fetch(\`/api/admin/matrices/\${matrixId}/impact\`, {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDeleteImpact(data.impact);
    } catch (e: any) {
      setDeleteError(e.message);
    } finally {
      setIsLoadingImpact(false);
    }
  };

  const handleForceDeleteMatrix = async () => {
    if (!matrixToDelete || isDeleting || !deleteImpact) return;
    setIsDeleting(true);
    try {
      setDeleteError('');
      const token = await user?.getIdToken();
      const res = await fetch(\`/api/admin/matrices/\${matrixToDelete.id}/force-delete\`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${token}\` 
        },
        body: JSON.stringify({
          expectedAssessments: deleteImpact.assessmentsCount,
          expectedReports: deleteImpact.reportsCount,
          expectedValidated: deleteImpact.validatedReportsCount
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir matriz');
      
      setMatrices(prev => prev.filter(m => m.id !== matrixToDelete.id));
      setMatrixToDelete(null);
      setDeleteImpact(null);
      setDeleteError('');
    } catch(err: any) {
      setDeleteError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };`;

// replace old handleDeleteMatrix
code = code.replace(/const handleDeleteMatrix = async \(\) => \{[\s\S]*?\n  \};\n/, deleteFunction + '\n');

fs.writeFileSync('src/pages/Matrices.tsx', code);
