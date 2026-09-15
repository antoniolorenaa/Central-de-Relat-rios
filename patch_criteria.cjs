const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

const replacement = `{stuMatrix.criteria.map((crit: any) => {
                            const ans = selectedAssessment?.answers?.[crit.id];
                            return (
                              <div
                                key={crit.id}
                                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    {crit.category && (
                                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-medium">
                                        {crit.category}
                                      </span>
                                    )}
                                    {crit.code && (
                                      <span className="text-gray-400 text-xs font-mono">
                                        {crit.code}
                                      </span>
                                    )}
                                    {crit.required && (
                                      <span className="text-red-500 text-xs font-bold" title="Obrigatório">*</span>
                                    )}
                                  </div>
                                  <h3 className="font-medium text-gray-900 mb-1">
                                    {crit.objective || crit.description}
                                  </h3>
                                  {crit.objective && crit.description && (
                                    <p className="text-sm text-gray-500">
                                      {crit.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      handleAnswer(
                                        selectedStudent.enrollment.id,
                                        crit.id,
                                        ans === "D" ? null : "D",
                                        stuMatrix,
                                      )
                                    }
                                    className={\`w-14 h-10 rounded-md font-bold text-sm border transition-all \${
                                      ans === "D"
                                        ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/20 ring-offset-1"
                                        : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                                    }\`}
                                    disabled={
                                      selectedReport?.reportStatus ===
                                      "VALIDATED"
                                    }
                                  >
                                    D
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleAnswer(
                                        selectedStudent.enrollment.id,
                                        crit.id,
                                        ans === "ED" ? null : "ED",
                                        stuMatrix,
                                      )
                                    }
                                    className={\`w-14 h-10 rounded-md font-bold text-sm border transition-all \${
                                      ans === "ED"
                                        ? "bg-amber-500 text-white border-amber-500 ring-2 ring-amber-500/20 ring-offset-1"
                                        : "bg-white text-gray-600 border-gray-300 hover:border-amber-400 hover:bg-amber-50"
                                    }\`}
                                    disabled={
                                      selectedReport?.reportStatus ===
                                      "VALIDATED"
                                    }
                                  >
                                    ED
                                  </button>
                                </div>
                              </div>
                            );
                          })}`;

code = code.replace(/\{stuMatrix\.criteria\.map\(\(crit: any\) => \{[\s\S]*?\}\)\}/, replacement);
fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
