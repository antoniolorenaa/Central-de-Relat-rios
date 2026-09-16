const fs = require('fs');
let code = fs.readFileSync('src/pages/Matrices.tsx', 'utf8');

// 1. Add `deleteError` state
code = code.replace(/const \[matrixToDelete, setMatrixToDelete\] = useState<Matrix \| null>\(null\);\n  const \[isDeleting, setIsDeleting\] = useState\(false\);/,
  `const [matrixToDelete, setMatrixToDelete] = useState<Matrix | null>(null);\n  const [isDeleting, setIsDeleting] = useState(false);\n  const [deleteError, setDeleteError] = useState('');`);

// 2. Fix the handleDeleteMatrix catch block to NOT setMatrixToDelete(null)
code = code.replace(/    \} catch\(err: any\) \{\n      setError\(err\.message\);\n      setMatrixToDelete\(null\);\n    \} finally \{/,
  `    } catch(err: any) {\n      setDeleteError(err.message);\n    } finally {`);
// Also clear deleteError on success and in try block
code = code.replace(/    try \{\n      const token = await user\?\.getIdToken\(\);/,
  `    try {\n      setDeleteError('');\n      const token = await user?.getIdToken();`);
code = code.replace(/      setMatrices\(prev => prev\.filter\(m => m\.id !== matrixToDelete\.id\)\);\n      setMatrixToDelete\(null\);/,
  `      setMatrices(prev => prev.filter(m => m.id !== matrixToDelete.id));\n      setMatrixToDelete(null);\n      setDeleteError('');`);

// 3. Fix the buttons in the matrix item list (lines ~300 to ~345)
// Find the whole block after `</div>` which ends the matrix info block, until the closing `</div>` of the matrix item block.
// Let's use a regex that matches `</div>` (the one closing matrix info), then `{matrix.status === 'DRAFT' && ...` until `Arquivada</div>)}`.
// Actually, it's safer to just split and replace based on unique anchors.

const regexStr = 
`                        {matrix.status === 'DRAFT' && confirmPublishId !== matrix.id && \\(
                          <Button variant="outline" className="text-green-700 border-green-200 hover:bg-green-50 whitespace-nowrap" onClick=\\{\\(\\) => setConfirmPublishId\\(matrix\\.id\\)\\}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Publicar
                          </Button>
                        \\)}
                        {matrix.status === 'DRAFT' && confirmPublishId === matrix.id && \\(
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button variant="outline" className="whitespace-nowrap" onClick=\\{\\(\\) => setConfirmPublishId\\(null\\)\\}>
                              Cancelar
                            </Button>
                            <Button className="bg-green-600 hover:bg-green-700 whitespace-nowrap" onClick=\\{\\(\\) => publishMatrix\\(matrix\\.id\\)\\}>
                              Confirmar Publicação
                            </Button>
                          </div>
                        \\)}
                        {matrix.status === 'DRAFT' && confirmPublishId !== matrix.id && \\(
                          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 whitespace-nowrap ml-2" onClick=\\{\\(\\) => setMatrixToDelete\\(matrix\\)\\}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir rascunho
                          </Button>
                        \\)}
                        {matrix.status === 'DRAFT' && confirmPublishId !== matrix.id && \\(
                          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 whitespace-nowrap" onClick=\\{\\(\\) => setMatrixToDelete\\(matrix\\)\\}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir rascunho
                          </Button>
                        \\)}
                        {matrix.status === 'PUBLISHED' && \\(
                          <div className="text-sm text-green-700 font-medium flex items-center">
                            <CheckCircle className="w-4 h-4 mr-1" /> Ativa
                          </div>
                        \\)}
                        {matrix.status === 'ARCHIVED' && \\(
                          <div className="text-sm text-gray-500 font-medium flex items-center">
                            <Archive className="w-4 h-4 mr-1" /> Arquivada
                          </div>
                        \\)}`;

const replacementCode = 
`                      <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0 justify-end">
                        {matrix.status === 'DRAFT' && confirmPublishId !== matrix.id && (
                          <>
                            <Button variant="outline" className="text-green-700 border-green-200 hover:bg-green-50 whitespace-nowrap" onClick={() => setConfirmPublishId(matrix.id)}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Publicar
                            </Button>
                            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 whitespace-nowrap" onClick={() => { setDeleteError(''); setMatrixToDelete(matrix); }}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir rascunho
                            </Button>
                          </>
                        )}
                        {matrix.status === 'DRAFT' && confirmPublishId === matrix.id && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button variant="outline" className="whitespace-nowrap" onClick={() => setConfirmPublishId(null)}>
                              Cancelar
                            </Button>
                            <Button className="bg-green-600 hover:bg-green-700 whitespace-nowrap" onClick={() => publishMatrix(matrix.id)}>
                              Confirmar Publicação
                            </Button>
                          </div>
                        )}
                        {matrix.status === 'PUBLISHED' && (
                          <div className="text-sm text-green-700 font-medium flex items-center">
                            <CheckCircle className="w-4 h-4 mr-1" /> Ativa
                          </div>
                        )}
                        {matrix.status === 'ARCHIVED' && (
                          <div className="text-sm text-gray-500 font-medium flex items-center">
                            <Archive className="w-4 h-4 mr-1" /> Arquivada
                          </div>
                        )}
                      </div>`;

const searchRegex = new RegExp(regexStr.replace(/\s+/g, '\\s+'));
code = code.replace(searchRegex, replacementCode);

// 4. Update the ConfirmModal to pass isLoading and error
const modalRegexStr = 
`      <ConfirmModal
        isOpen=\\{!!matrixToDelete\\}
        title="Excluir Rascunho"
        message=\\{matrixToDelete \\? \\\`Deseja realmente excluir o rascunho da matriz "\\\$\\{meta\\.gradeLevels\\?\\.find\\(\\(g: any\\) => g\\.id === matrixToDelete\\.gradeLevelId\\)\\?\\.name \\|\\| matrixToDelete\\.gradeLevelId\\}" \\(Ano: \\\$\\{matrixToDelete\\.schoolYear\\}, Período: \\\$\\{matrixToDelete\\.period\\}, Marca: \\\$\\{meta\\.brands\\?\\.find\\(\\(b: any\\) => b\\.id === matrixToDelete\\.brandId\\)\\?\\.name \\|\\| matrixToDelete\\.brandId\\}, Programa: \\\$\\{meta\\.programs\\?\\.find\\(\\(p: any\\) => p\\.id === matrixToDelete\\.programId\\)\\?\\.name \\|\\| matrixToDelete\\.programId\\}\\)\\?\\\` : ''\\}
        confirmText=\\{isDeleting \\? "Excluindo\\.\\.\\." : "Sim, Excluir"\\}
        cancelText="Cancelar"
        onConfirm=\\{handleDeleteMatrix\\}
        onCancel=\\{\\(\\) => \\{
          if \\(\\!isDeleting\\) setMatrixToDelete\\(null\\);
        \\}\\}
      />`;

const modalReplacementCode = 
`      <ConfirmModal
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

const modalSearchRegex = new RegExp(modalRegexStr.replace(/\s+/g, '\\s+'));
code = code.replace(modalSearchRegex, modalReplacementCode);

fs.writeFileSync('src/pages/Matrices.tsx', code);
