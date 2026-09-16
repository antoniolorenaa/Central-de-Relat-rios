const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

// Add icon
code = code.replace("RefreshCcw,", "RefreshCcw,\n  Sparkles,");

// Add states
const stateTarget = `const [savingError, setSavingError] = useState("");`;
const stateNew = `const [savingError, setSavingError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiSuggestionRevision, setAiSuggestionRevision] = useState<{reportRevision: number, assessmentRevision: number} | null>(null);`;
code = code.replace(stateTarget, stateNew);

// Add functions
const functionsTarget = `const saveReportNow = async () => { if (isAssessmentInconsistent) return;`;
const functionsNew = `const handleGenerateSuggestion = async () => {
    if (isAssessmentInconsistent) return;
    if (!selectedStudent || !selectedReport || !selectedAssessment) return;
    if (selectedAssessment.status !== "COMPLETED") return;
    if (selectedReport.reportStatus === "VALIDATED") return;
    
    if (isReportDirty || savingState === "saving") {
      setGenerationError("Aguarde o salvamento das alterações locais antes de gerar.");
      return;
    }
    
    setIsGenerating(true);
    setGenerationError("");
    setAiSuggestion(null);
    setAiSuggestionRevision(null);
    
    try {
      const token = await user?.getIdToken();
      const payload = {
        enrollmentId: selectedStudent.enrollment.id,
        assessmentId: selectedAssessment.id,
        period,
      };
      const res = await fetch(\`/api/academic/reports/\${selectedReport.id}/generate-suggestion\`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: \`Bearer \${token}\` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar sugestão.");
      setAiSuggestion(data.suggestion);
      setAiSuggestionRevision({
        reportRevision: data.reportRevision,
        assessmentRevision: data.assessmentRevision
      });
    } catch (e: any) {
      setGenerationError(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplySuggestion = () => {
    if (!aiSuggestion || !selectedReport || !selectedAssessment || !aiSuggestionRevision) return;
    
    if (selectedReport.revision !== aiSuggestionRevision.reportRevision) {
      setGenerationError("O relatório foi modificado desde a geração da sugestão. Gere novamente.");
      return;
    }
    if (selectedAssessment.revision !== aiSuggestionRevision.assessmentRevision) {
      setGenerationError("A avaliação foi modificada desde a geração da sugestão. Gere novamente.");
      return;
    }
    
    if (localReport.finalText?.trim() !== "") {
      if (!window.confirm("Isso irá substituir o parecer atual. Tem certeza?")) return;
    }
    
    handleReportChange("finalText", aiSuggestion);
    setAiSuggestion(null);
    setAiSuggestionRevision(null);
    
    setTimeout(() => saveReportNow(), 100);
  };

  const saveReportNow = async () => { if (isAssessmentInconsistent) return;`;
code = code.replace(functionsTarget, functionsNew);

// Add UI
const uiTarget = `<h2 className="text-lg font-bold text-[#0f172a] mb-4">
                          3. Parecer Pedagógico
                        </h2>
                        <div className="space-y-4">`;
                        
const uiNew = `<div className="flex justify-between items-center mb-4">
                          <h2 className="text-lg font-bold text-[#0f172a]">
                            3. Parecer Pedagógico
                          </h2>
                          {selectedAssessment?.status === "COMPLETED" && selectedReport?.reportStatus !== "VALIDATED" && (
                            <Button
                              variant="outline"
                              onClick={handleGenerateSuggestion}
                              disabled={isGenerating || isReportDirty || savingState === "saving"}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs py-1 h-8"
                            >
                              {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                              Gerar sugestão com IA
                            </Button>
                          )}
                        </div>
                        
                        {generationError && (
                          <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-100 mb-4 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                            {generationError}
                          </div>
                        )}
                        
                        {aiSuggestion && (
                          <div className="mb-6 bg-[#f8fafc] border border-blue-100 rounded-lg overflow-hidden shadow-sm">
                            <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex justify-between items-center">
                              <span className="text-sm font-semibold text-blue-800 flex items-center">
                                <Sparkles className="w-4 h-4 mr-2" />
                                Sugestão da IA
                              </span>
                              <div className="flex gap-2">
                                <button onClick={() => setAiSuggestion(null)} className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1">
                                  Descartar
                                </button>
                                <button onClick={handleGenerateSuggestion} disabled={isGenerating} className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1">
                                  Gerar novamente
                                </button>
                              </div>
                            </div>
                            <div className="p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                              {aiSuggestion}
                            </div>
                            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                              <Button size="sm" onClick={handleApplySuggestion} className="bg-blue-600 hover:bg-blue-700">
                                Aplicar ao parecer
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-4">`;
code = code.replace(uiTarget, uiNew);

// Clear ai suggestions when selected student changes
const changeStudentTarget = `const selectedReport = selectedStudent ? getReport(selectedStudent.id) : null;

  // Sync local report state when selected student changes`;
const changeStudentNew = `const selectedReport = selectedStudent ? getReport(selectedStudent.id) : null;

  useEffect(() => {
    setAiSuggestion(null);
    setGenerationError("");
  }, [selectedStudent?.id]);

  // Sync local report state when selected student changes`;
code = code.replace(changeStudentTarget, changeStudentNew);


fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
