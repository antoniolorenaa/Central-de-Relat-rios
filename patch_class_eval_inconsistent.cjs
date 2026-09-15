const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

// Disable inputs when inconsistent
const inputSearch = /disabled=\{!selectedStudent \|\| selectedReport\?\.reportStatus === "VALIDATED"\}/g;
const inputReplace = `disabled={!selectedStudent || selectedReport?.reportStatus === "VALIDATED" || isAssessmentInconsistent}`;
code = code.replace(inputSearch, inputReplace);

// Render an error message above the inputs
const mainAreaStart = /<div className="flex-1 overflow-auto bg-gray-50">\s*<div className="max-w-4xl mx-auto p-6 space-y-8">/;
const errorMessage = `
        {isAssessmentInconsistent && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">Erro de Integridade</p>
              <p className="text-xs mt-1">
                A avaliação vinculada a este relatório não pôde ser encontrada.
                Por favor, contate o administrador do sistema.
              </p>
            </div>
          </div>
        )}
`;
code = code.replace(mainAreaStart, `$&${errorMessage}`);

fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
