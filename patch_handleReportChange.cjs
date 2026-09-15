const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

code = code.replace(/const handleReportChange = \([\s\S]*?\}, 1000\);\n  \};/m, 
`const handleReportChange = (field: string, value: string) => {
    if (!selectedStudent || selectedReport?.reportStatus === "VALIDATED")
      return;

    setLocalReport((prev) => ({ ...prev, [field]: value }));
    setIsReportDirty(true);

    setSavingState("saving");
    setSavingError("");

    if (reportSaveTimeoutRef.current)
      clearTimeout(reportSaveTimeoutRef.current);

    reportSaveTimeoutRef.current = setTimeout(async () => {
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
          selectedReport?.id ||
          \`rep_\${selectedStudent.enrollment.id}_\${period}\`;
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
        setTimeout(() => setSavingState("idle"), 2000);
      } catch (err: any) {
        setSavingError(err.message);
      }
    }, 1000);
  };`);

fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
