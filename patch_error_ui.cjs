const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

const errorBlock = `{savingState === "error" && (
                      <div className="flex flex-col md:flex-row items-center gap-3">
                        <span
                          className="text-red-600 flex items-center font-medium"
                          title={savingError}
                        >
                          <AlertCircle className="w-4 h-4 mr-1.5" /> {savingError || "Erro ao salvar"}
                        </span>
                        {isReportDirty && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-red-700 border-red-200 hover:bg-red-50"
                            onClick={() => {
                              if (window.confirm("Isso apagará suas edições não salvas e recarregará a versão do servidor. Confirma?")) {
                                lastLoadedReportRef.current = 'force-reload-' + Date.now();
                                setLocalReport({
                                  strengths: selectedReport?.strengths || "",
                                  developmentAspects: selectedReport?.developmentAspects || "",
                                  additionalInformation: selectedReport?.additionalInformation || "",
                                  finalText: selectedReport?.finalText || "",
                                });
                                setIsReportDirty(false);
                                setSavingState("idle");
                                setSavingError("");
                              }
                            }}
                          >
                            Recarregar (descartar local)
                          </Button>
                        )}
                      </div>
                    )}`;

code = code.replace(/\{savingState === "error" && \([\s\S]*?\}\)/, errorBlock);
fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
