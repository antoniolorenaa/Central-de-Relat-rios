const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

const oldCode = `      setSavingState("saved");
        const sentDraft = payload;
        const currentDraft = localReportRef.current;
        if (
          currentDraft.strengths === sentDraft.strengths &&
          currentDraft.developmentAspects === sentDraft.developmentAspects &&
          currentDraft.additionalInformation === sentDraft.additionalInformation &&
          currentDraft.finalText === sentDraft.finalText
        ) {
          setIsReportDirty(false);
        }`;

code = code.replace(oldCode, `      setSavingState("saved");`);
fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
