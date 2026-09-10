const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

const target = `      const token = await user?.getIdToken();
      const reportId = selectedReport?.id;
      const res = await fetch(\`/api/academic/reports/\${reportId}/reopen\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify({ 
          enrollmentId: selectedStudent.enrollment.id,
          period, 
          expectedRevision: selectedReport.revision 
        })
      });`;

const replacement = `      const token = await user?.getIdToken();
      const currentAss = assessments.find(a => a.enrollmentId === selectedStudent.enrollment.id);
      const assessmentId = currentAss?.id || \`ass_\${selectedStudent.enrollment.id}_\${stuMatrix?.id}_\${period}\`;
      const reportId = selectedReport?.id || \`rep_\${assessmentId}\`;
      const res = await fetch(\`/api/academic/reports/\${reportId}/reopen\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify({ 
          enrollmentId: selectedStudent.enrollment.id,
          assessmentId,
          period, 
          expectedRevision: selectedReport.revision 
        })
      });`;

code = code.replace(target, replacement);

fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
