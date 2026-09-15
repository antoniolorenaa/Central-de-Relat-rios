const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

const replacement = `const getAssessment = (studentId: string) => {
    const stu = students.find((s) => s.id === studentId);
    if (!stu) return null;

    const rep = reports.find((r) => r.enrollmentId === stu.enrollment.id && r.period === period);
    if (rep && rep.assessmentId) {
      return assessments.find((a) => a.id === rep.assessmentId) || null;
    }

    const matrix = getMatrix(stu.enrollment.classId);
    if (!matrix) return null;
    return assessments.find(
      (a) =>
        a.enrollmentId === stu.enrollment.id &&
        a.matrixId === matrix.id &&
        a.period === period
    ) || null;
  };`;

code = code.replace(/const getAssessment = \(studentId: string\) => \{[\s\S]*?return assessments\.find\(\(a\) => a\.enrollmentId === stu\.enrollment\.id\);\s*\};/, replacement);

fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);
