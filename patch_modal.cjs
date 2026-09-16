const fs = require('fs');
let code = fs.readFileSync('src/pages/Matrices.tsx', 'utf8');

const targetModal = `<ConfirmModal
        isOpen={!!matrixToDelete}
        title="Excluir Rascunho"
        message={matrixToDelete ? \`Deseja realmente excluir o rascunho da matriz "\${meta.gradeLevels?.find((g: any) => g.id === matrixToDelete.gradeLevelId)?.name || matrixToDelete.gradeLevelId}" (Ano: \${matrixToDelete.schoolYear}, Período: \${matrixToDelete.period}, Marca: \${meta.brands?.find((b: any) => b.id === matrixToDelete.brandId)?.name || matrixToDelete.brandId}, Programa: \${meta.programs?.find((p: any) => p.id === matrixToDelete.programId)?.name || matrixToDelete.programId})?\` : ''}
        confirmText={isDeleting ? "Excluindo..." : "Sim, Excluir"}
        cancelText="Cancelar"
        onConfirm={handleDeleteMatrix}
        onCancel={() => {
          if (!isDeleting) {
            setMatrixToDelete(null);
            setDeleteError('');
          }
        }}
        isLoading={isDeleting}
        error={deleteError}
      />`;

const newModal = `{matrixToDelete && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Matriz</h3>
      <div className="text-sm text-gray-600 mb-4 space-y-2">
        <p><strong>Atenção:</strong> Esta ação é irreversível.</p>
        <p>Série: {meta.gradeLevels?.find((g: any) => g.id === matrixToDelete.gradeLevelId)?.name || matrixToDelete.gradeLevelId} • Ano: {matrixToDelete.schoolYear} • Período: {matrixToDelete.period}</p>
        
        {isLoadingImpact ? (
          <div className="flex items-center gap-2 mt-4 text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Calculando impacto...</span>
          </div>
        ) : deleteImpact ? (
          <div className="bg-red-50 p-3 rounded text-red-800 mt-4 text-xs font-medium space-y-1 border border-red-100">
            <p>• {deleteImpact.assessmentsCount} avaliações serão removidas.</p>
            <p>• {deleteImpact.affectedStudentsCount} alunos afetados (respostas D/ED serão apagadas).</p>
            <p>• {deleteImpact.reportsCount} pareceres ficarão sem avaliação vinculada.</p>
            <p>• {deleteImpact.validatedReportsCount} pareceres perderão o status de validado.</p>
          </div>
        ) : null}
        
        <p className="mt-4 font-semibold text-red-600">Confirma que as respostas D/ED da matriz selecionada serão removidas?</p>
      </div>

      {deleteError && (
        <div className="p-3 text-sm text-red-800 bg-red-50 rounded-md mb-4 border border-red-100">
          {deleteError}
        </div>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={() => { if (!isDeleting) { setMatrixToDelete(null); setDeleteImpact(null); setDeleteError(''); } }}>
          Cancelar
        </Button>
        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleForceDeleteMatrix} disabled={isDeleting || isLoadingImpact || !deleteImpact}>
          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {isDeleting ? "Excluindo..." : "Sim, Excluir"}
        </Button>
      </div>
    </div>
  </div>
)}`;

code = code.replace(targetModal, newModal);
fs.writeFileSync('src/pages/Matrices.tsx', code);
