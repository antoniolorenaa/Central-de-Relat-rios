const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

// 1. Add ref
code = code.replace(
  /const \[isReportDirty, setIsReportDirty\] = useState\(false\);/,
  `$&
  const localReportRef = useRef(localReport);
  useEffect(() => {
    localReportRef.current = localReport;
  }, [localReport]);`
);

// 2. Modify saveReportNow to compare draft
// Look for setSavingState("saved"); setIsReportDirty(false);
code = code.replace(
  /setSavingState\("saved"\); setIsReportDirty\(false\);/g,
  `setSavingState("saved");
        const sentDraft = payload;
        const currentDraft = localReportRef.current;
        if (
          currentDraft.strengths === sentDraft.strengths &&
          currentDraft.developmentAspects === sentDraft.developmentAspects &&
          currentDraft.additionalInformation === sentDraft.additionalInformation &&
          currentDraft.finalText === sentDraft.finalText
        ) {
          setIsReportDirty(false);
        }`
);

fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
