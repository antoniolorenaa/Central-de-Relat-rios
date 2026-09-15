const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

// 1. Add saveTokenRef
code = code.replace(
  /const localReportRef = useRef\(localReport\);/,
  `const localReportRef = useRef(localReport);
  const saveTokenRef = useRef(0);`
);

// 2. Patch handleReportChange
code = code.replace(/const handleReportChange = \([\s\S]*?\}, 1000\);\n  \};/m, 
`const handleReportChange = (field: string, value: string) => {
    if (!selectedStudent || selectedReport?.reportStatus === "VALIDATED")
      return;

    const nextDraft = { ...localReport, [field]: value };
    setLocalReport(nextDraft);
    setIsReportDirty(true);

    setSavingState("saving");
    setSavingError("");

    if (reportSaveTimeoutRef.current)
      clearTimeout(reportSaveTimeoutRef.current);

    const myToken = ++saveTokenRef.current;
    const savingStudentId = selectedStudent.id;
    const savingEnrollmentId = selectedStudent.enrollment.id;

    reportSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const payload = {
          period,
          matrixId: stuMatrix?.id,
          strengths: nextDraft.strengths,
          developmentAspects: nextDraft.developmentAspects,
          additionalInformation: nextDraft.additionalInformation,
          finalText: nextDraft.finalText,
          expectedRevision: selectedReport?.revision,
        };

        const token = await user?.getIdToken();
        const currentAss = getAssessment(savingStudentId);
        const assessmentId =
          currentAss?.id ||
          \`ass_\${savingEnrollmentId}_\${stuMatrix?.id}_\${period}\`;
        const reportId =
          selectedReport?.id ||
          \`rep_\${savingEnrollmentId}_\${period}\`;
        (payload as any).assessmentId = assessmentId;
        (payload as any).enrollmentId = savingEnrollmentId;

        const res = await fetch(\`/api/academic/reports/\${reportId}\`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: \`Bearer \${token}\`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        // If context changed or discarded, update cache but don't touch UI state
        if (myToken !== saveTokenRef.current) {
          if (res.ok) {
            setReports((prev) => {
              const idx = prev.findIndex((r) => r.id === data.report.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = data.report;
                return next;
              }
              return [...prev, data.report];
            });
          }
          return;
        }

        if (!res.ok) {
          if (res.status === 409) {
            setSavingError(data.error || "Conflito de edição detectado.");
            setSavingState("error");
            fetchData(true);
            return;
          }
          throw new Error(data.error || "Erro ao salvar relatório");
        }

        setReports((prev) => {
          const idx = prev.findIndex((r) => r.id === data.report.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = data.report;
            return next;
          } else {
            return [...prev, data.report];
          }
        });

        setSavingState("saved");
        const currentDraft = localReportRef.current;
        if (
          currentDraft.strengths === nextDraft.strengths &&
          currentDraft.developmentAspects === nextDraft.developmentAspects &&
          currentDraft.additionalInformation === nextDraft.additionalInformation &&
          currentDraft.finalText === nextDraft.finalText
        ) {
          setIsReportDirty(false);
        }
        setTimeout(() => {
          if (myToken === saveTokenRef.current) setSavingState("idle");
        }, 2000);
      } catch (err: any) {
        if (myToken === saveTokenRef.current) setSavingError(err.message);
      }
    }, 1000);
  };`);

// 3. Patch saveReportNow
code = code.replace(/const saveReportNow = async \(\) => \{ if \(isAssessmentInconsistent\) return;\n    if \(!selectedStudent \|\| selectedReport\?\.reportStatus === "VALIDATED"\)\n      return;\n    if \(reportSaveTimeoutRef\.current\)\n      clearTimeout\(reportSaveTimeoutRef\.current\);\n\n    setSavingState\("saving"\);[\s\S]*?setTimeout\(\(\) => setSavingState\("idle"\), 2000\);\n    \} catch \(err: any\) \{/m, 
`const saveReportNow = async () => { if (isAssessmentInconsistent) return;
    if (!selectedStudent || selectedReport?.reportStatus === "VALIDATED")
      return;
    if (reportSaveTimeoutRef.current)
      clearTimeout(reportSaveTimeoutRef.current);

    setSavingState("saving");
    const myToken = ++saveTokenRef.current;
    try {
      const sentDraft = localReportRef.current;
      const payload = {
        period,
        matrixId: stuMatrix?.id,
        strengths: sentDraft.strengths,
        developmentAspects: sentDraft.developmentAspects,
        additionalInformation: sentDraft.additionalInformation,
        finalText: sentDraft.finalText,
        expectedRevision: selectedReport?.revision,
      };

      const token = await user?.getIdToken();

      const currentAss = getAssessment(selectedStudent.id);
      const assessmentId =
        currentAss?.id ||
        \`ass_\${selectedStudent.enrollment.id}_\${stuMatrix?.id}_\${period}\`;
      const reportId =
        selectedReport?.id || \`rep_\${selectedStudent.enrollment.id}_\${period}\`;
      (payload as any).assessmentId = assessmentId;
      (payload as any).enrollmentId = selectedStudent.enrollment.id;

      const res = await fetch(\`/api/academic/reports/\${reportId}\`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: \`Bearer \${token}\`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (myToken !== saveTokenRef.current) {
        if (res.ok) {
          setReports((prev) => {
            const idx = prev.findIndex((r) => r.id === data.report.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = data.report;
              return next;
            }
            return [...prev, data.report];
          });
        }
        return;
      }

      if (!res.ok) {
        if (res.status === 409) {
          setSavingError(data.error || "Conflito de edição detectado.");
          setSavingState("error");
          fetchData(true);
          return;
        }
        throw new Error(data.error || "Erro ao salvar relatório");
      }

      setReports((prev) => {
        const idx = prev.findIndex((r) => r.id === data.report.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = data.report;
          return next;
        } else {
          return [...prev, data.report];
        }
      });

      setSavingState("saved");
      const currentDraft = localReportRef.current;
      if (
        currentDraft.strengths === sentDraft.strengths &&
        currentDraft.developmentAspects === sentDraft.developmentAspects &&
        currentDraft.additionalInformation === sentDraft.additionalInformation &&
        currentDraft.finalText === sentDraft.finalText
      ) {
        setIsReportDirty(false);
      }
      setTimeout(() => {
        if (myToken === saveTokenRef.current) setSavingState("idle");
      }, 2000);
    } catch (err: any) {`);

// 4. Update the explicit discard logic to increment saveTokenRef and clear timeout
code = code.replace(
  /if \(window\.confirm\("Isso apagará suas edições não salvas e recarregará a versão do servidor\. Confirma\?"\)\) \{/,
  `if (window.confirm("Isso apagará suas edições não salvas e recarregará a versão do servidor. Confirma?")) {
    if (reportSaveTimeoutRef.current) clearTimeout(reportSaveTimeoutRef.current);
    saveTokenRef.current++;`
);

fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
