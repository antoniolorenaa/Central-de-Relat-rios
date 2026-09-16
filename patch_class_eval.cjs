const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

const targetVal = `{selectedReport?.reportStatus === "VALIDATED" ? (
                          <>
                            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-bold text-sm flex items-center">`;

const replaceVal = `{!selectedAssessment && selectedReport && !selectedReport.assessmentId ? (
                          <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-full font-bold text-sm flex items-center">
                            Aguardando nova matriz/avaliação
                          </div>
                        ) : selectedReport?.reportStatus === "VALIDATED" ? (
                          <>
                            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-bold text-sm flex items-center">`;

code = code.replace(targetVal, replaceVal);
fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
