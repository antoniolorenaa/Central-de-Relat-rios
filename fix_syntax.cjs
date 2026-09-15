const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

const replacement = `                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                  {!stuMatrix ? (
                    <div className="bg-white border border-gray-200 text-gray-600 p-12 rounded-lg flex flex-col items-center justify-center">
                      <AlertCircle className="w-12 h-12 mb-4 text-amber-500" />
                      <h2 className="text-lg font-bold text-gray-900 mb-2">
                        Matriz Indisponível
                      </h2>
                      <p>Não há matriz ativa para avaliar este aluno.</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Avaliação por Critérios */}
                      <div>
                        <h2 className="text-lg font-bold text-[#0f172a] mb-4">
                          1. Avaliação por Critérios
                        </h2>
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                          {stuMatrix.criteria.map((crit: any) => {
                            const ans = selectedAssessment?.answers?.[crit.id];
                            return (
                              <div
                                key={crit.id}
                                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex-1">
                                  <h3 className="font-medium text-gray-900 mb-1">
                                    {crit.description}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-2">`;

code = code.replace(/\}\}\s+<\/div>\s+<\/div>\s+\);\s+\}\)\}\s+<\/div>\s+<\/div>\s+<hr className="border-gray-200" \/>/, replacement + `\n                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <hr className="border-gray-200" />`);

// I need to be careful with the exact replace.
// In the current file:
/*
                      </div>
                    )}}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
*/
// The }}` comes from `)}` which closes the `{savingState === "error" && (` block.
