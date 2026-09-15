const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

const oldReopen = `          if (!res.ok) {
            if (res.status === 409) fetchData();
            throw new Error(data.error || "Erro ao reabrir relatório");
          }

          setReports((prev) => {
            const idx = prev.findIndex((r) => r.id === data.report.id);
            const next = [...prev];
            next[idx] = data.report;
            return next;
          });
          setSavingState("saved");
        const sentDraft = { strengths: payload.strengths, developmentAspects: payload.developmentAspects, additionalInformation: payload.additionalInformation, finalText: payload.finalText };
        const currentDraft = localReportRef.current;
        if (
          currentDraft.strengths === sentDraft.strengths &&
          currentDraft.developmentAspects === sentDraft.developmentAspects &&
          currentDraft.additionalInformation === sentDraft.additionalInformation &&
          currentDraft.finalText === sentDraft.finalText
        ) {
          setIsReportDirty(false);
        }
          setTimeout(() => setSavingState("idle"), 2000);`;

const newReopen = `          if (!res.ok) {
            if (res.status === 409) {
              setSavingError(data.error || "Conflito de edição detectado.");
              setSavingState("error");
              fetchData(true);
              return;
            }
            throw new Error(data.error || "Erro ao reabrir relatório");
          }

          setReports((prev) => {
            const idx = prev.findIndex((r) => r.id === data.report.id);
            const next = [...prev];
            next[idx] = data.report;
            return next;
          });
          setSavingState("saved");
          setTimeout(() => setSavingState("idle"), 2000);`;

code = code.replace(oldReopen, newReopen);
fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
