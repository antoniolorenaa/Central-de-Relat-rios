const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

// 1. Add isReportDirty state
code = code.replace(
  /const \[localReport, setLocalReport\] = useState<\s*\{[\s\S]*?\}\s*>\([\s\S]*?\);/,
  `$&
  const [isReportDirty, setIsReportDirty] = useState(false);
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);`
);

// 2. Modify handleReportChange to set dirty
code = code.replace(
  /setLocalReport\(\(prev\) => \(\{\s*\.\.\.prev,\s*\[field\]: value\s*\}\)\);/,
  `$&
    setIsReportDirty(true);`
);

// 3. Modify useEffect for localReport
const oldUseEffect = `  useEffect(() => {
    if (selectedReport) {
      setLocalReport({
        strengths: selectedReport.strengths || "",
        developmentAspects: selectedReport.developmentAspects || "",
        additionalInformation: selectedReport.additionalInformation || "",
        finalText: selectedReport.finalText || "",
      });
    } else {
      setLocalReport({
        strengths: "",
        developmentAspects: "",
        additionalInformation: "",
        finalText: "",
      });
    }
  }, [selectedReport]);`;

const newUseEffect = `  useEffect(() => {
    if (!isReportDirty) {
      if (selectedReport) {
        setLocalReport({
          strengths: selectedReport.strengths || "",
          developmentAspects: selectedReport.developmentAspects || "",
          additionalInformation: selectedReport.additionalInformation || "",
          finalText: selectedReport.finalText || "",
        });
      } else {
        setLocalReport({
          strengths: "",
          developmentAspects: "",
          additionalInformation: "",
          finalText: "",
        });
      }
    }
  }, [selectedReport, isReportDirty]);`;

code = code.replace(oldUseEffect, newUseEffect);

// 4. Reset dirty on successful save
code = code.replace(
  /setSavingState\("saved"\);/g,
  `setSavingState("saved"); setIsReportDirty(false);`
);

// 5. Create handleStudentSelection wrapper
const handleStudentSelectionDef = `
  const handleStudentSelection = (newStudentId: string) => {
    if (isReportDirty && savingState === "error") {
      if (!window.confirm("Você tem alterações com erro de salvamento. Deseja descartá-las e mudar de aluno?")) {
        return;
      }
    } else if (isReportDirty && savingState === "saving") {
      if (!window.confirm("Salvamento em andamento. Deseja forçar a mudança de aluno e possivelmente perder alterações?")) {
        return;
      }
    }
    setIsReportDirty(false);
    setSavingState("idle");
    setSavingError("");
    setSelectedStudentId(newStudentId);
  };
`;

code = code.replace(
  /const filteredStudents = useMemo/,
  `${handleStudentSelectionDef}\n  const filteredStudents = useMemo`
);

// Replace setSelectedStudentId calls in the UI with handleStudentSelection
code = code.replace(/setSelectedStudentId\(stu\.id\)/g, `handleStudentSelection(stu.id)`);
code = code.replace(/setSelectedStudentId\(filteredStudents\[idx - 1\]\.id\)/g, `handleStudentSelection(filteredStudents[idx - 1].id)`);
code = code.replace(/setSelectedStudentId\(filteredStudents\[idx \+ 1\]\.id\)/g, `handleStudentSelection(filteredStudents[idx + 1].id)`);

// 6. Provide a way to discard draft on 409
code = code.replace(
  /\{savingState === "error" && \(\s*<div className="text-red-500 flex items-center gap-2">\s*<AlertCircle className="w-4 h-4" \/>\s*<span className="text-xs">\{savingError\}<\/span>\s*<\/div>\s*\)\}/,
  `{savingState === "error" && (
      <div className="text-red-500 flex flex-col gap-1 items-start">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs">{savingError}</span>
        </div>
        {isReportDirty && (
          <button
            onClick={() => setIsReportDirty(false)}
            className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
          >
            Recarregar do servidor (descartar local)
          </button>
        )}
      </div>
    )}`
);

fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
