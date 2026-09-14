const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

// Add beforeunload and fix useEffect for localReport
code = code.replace(
  /useEffect\(\(\) => \{\s*if \(selectedReport\) \{\s*setLocalReport\(\{/m,
  `const lastLoadedReportRef = useRef<string | null>(null);
  
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (savingState === "saving" || savingState === "error") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [savingState]);

  useEffect(() => {
    const currentReportKey = selectedReport ? selectedReport.id + '_' + selectedStudentId : 'none_' + selectedStudentId;
    if (currentReportKey !== lastLoadedReportRef.current) {
      lastLoadedReportRef.current = currentReportKey;
      if (selectedReport) {
        setLocalReport({`
);

// Close the if statement
code = code.replace(
  /finalText: "",\s*\}\);\s*\}\s*\}, \[selectedStudentId, selectedReport\]\);/m,
  `finalText: "",
      });
    }
    }
  }, [selectedStudentId, period, selectedReport]);`
);

// Prevent duplicate validate
code = code.replace(
  /const handleValidateReport = async \(\) => \{\s*if \(\!selectedStudent \|\| \!selectedReport\) return;/m,
  `const handleValidateReport = async () => {
    if (!selectedStudent || !selectedReport) return;
    if (savingState === "saving") return;`
);

// Prevent duplicate reopen
code = code.replace(
  /const handleReopenReport = async \(\) => \{\s*if \(\!selectedStudent \|\| \!selectedReport\) return;/m,
  `const handleReopenReport = async () => {
    if (!selectedStudent || !selectedReport) return;
    if (savingState === "saving") return;`
);

// Prevent duplicate transfer
code = code.replace(
  /const handleTransferMatrix = async \(\) => \{\s*if \(\!selectedStudent \|\| \!activeMatrix\) return;/m,
  `const handleTransferMatrix = async () => {
    if (!selectedStudent || !activeMatrix) return;
    if (savingState === "saving") return;`
);

// Make sure validate sends all local fields
code = code.replace(
  /body: JSON\.stringify\(\{\s*enrollmentId: selectedStudent\.enrollment\.id,\s*period,\s*assessmentId,\s*expectedRevision: selectedReport\?\.revision,\s*\}\),/m,
  `body: JSON.stringify({
                enrollmentId: selectedStudent.enrollment.id,
                period,
                assessmentId,
                expectedRevision: selectedReport?.revision,
                strengths: localReport.strengths,
                developmentAspects: localReport.developmentAspects,
                additionalInformation: localReport.additionalInformation,
                finalText: localReport.finalText,
              }),`
);

fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
