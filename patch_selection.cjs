const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

const regex = /const handleStudentSelection = \(newStudentId: string\) => \{\n\s+if \(reportSaveTimeoutRef\.current\) clearTimeout\(reportSaveTimeoutRef\.current\);\n\s+saveTokenRef\.current\+\+;\n\s+if \(isReportDirty && savingState === "error"\) \{\n\s+if \(!window\.confirm\("Você tem alterações com erro de salvamento\. Deseja descartá-las e mudar de aluno\?"\)\) \{\n\s+return;\n\s+\}\n\s+\} else if \(isReportDirty && savingState === "saving"\) \{\n\s+if \(!window\.confirm\("Salvamento em andamento\. Deseja forçar a mudança de aluno e possivelmente perder alterações\?"\)\) \{\n\s+return;\n\s+\}\n\s+\}/;

const replacement = `const handleStudentSelection = (newStudentId: string) => {
    if (isReportDirty && savingState === "error") {
      if (!window.confirm("Você tem alterações com erro de salvamento. Deseja descartá-las e mudar de aluno?")) {
        return;
      }
    } else if (isReportDirty && savingState === "saving") {
      if (!window.confirm("Salvamento em andamento. Deseja forçar a mudança de aluno e possivelmente perder alterações?")) {
        return;
      }
    }

    if (reportSaveTimeoutRef.current) clearTimeout(reportSaveTimeoutRef.current);
    saveTokenRef.current++;`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
    console.log("Patched successfully.");
} else {
    console.log("Regex not found.");
}
