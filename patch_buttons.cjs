const fs = require('fs');
let code = fs.readFileSync('src/pages/Matrices.tsx', 'utf8');

const targetButtons = `{matrix.status === 'DRAFT' && confirmPublishId !== matrix.id && (
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
                        )}`;

const newButtons = `{matrix.status === 'DRAFT' && confirmPublishId !== matrix.id && (
                          <Button variant="outline" className="text-green-700 border-green-200 hover:bg-green-50 whitespace-nowrap" onClick={() => setConfirmPublishId(matrix.id)}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Publicar
                          </Button>
                        )}
                        {profile?.role === 'MASTER' && confirmPublishId !== matrix.id && (
                          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 whitespace-nowrap" onClick={() => { setDeleteError(''); setMatrixToDelete(matrix); fetchDeleteImpact(matrix.id); }}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            {matrix.status === 'DRAFT' ? 'Excluir rascunho' : 'Excluir matriz'}
                          </Button>
                        )}`;

code = code.replace(targetButtons, newButtons);
fs.writeFileSync('src/pages/Matrices.tsx', code);
