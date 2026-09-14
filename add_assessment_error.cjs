const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

code = code.replace(
  /const stuMatrix = selectedAssessment/m,
  `const isAssessmentInconsistent = selectedReport && selectedReport.assessmentId && !selectedAssessment;
  
  const stuMatrix = selectedAssessment`
);

code = code.replace(
  /\{\/\* Assessment Content \*\/\}/,
  `{/* Assessment Content */}
                      {isAssessmentInconsistent && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center">
                          <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                          <p>
                            <strong>Erro de Integridade:</strong> A avaliação vinculada a este relatório (ID: {selectedReport.assessmentId}) não foi encontrada ou está inacessível. O sistema bloqueou a seleção automática de outra avaliação para evitar perda de dados.
                          </p>
                        </div>
                      )}`
);

fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
