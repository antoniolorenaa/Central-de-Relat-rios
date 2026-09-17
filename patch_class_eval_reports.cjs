const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

const targetUIUpdate = `      // Update with source of truth
      setAssessments((prev) => {`;

const newUIUpdate = `      if (data.report) {
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

      // Update with source of truth
      setAssessments((prev) => {`;

if (code.includes(targetUIUpdate)) {
  code = code.replace(targetUIUpdate, newUIUpdate);
  fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
  console.log("Patched ClassEvaluation.tsx for report update on answer");
} else {
  console.log("Target not found");
}
