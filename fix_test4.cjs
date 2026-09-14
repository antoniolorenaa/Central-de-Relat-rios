const fs = require('fs');
let code = fs.readFileSync('tests/test-consolidated.ts', 'utf8');
code = code.replace(
  /db\.store\.set\('reports\/rep_enr1_T1', \{ id: 'rep_enr1_T1', revision: 1, reportStatus: 'IN_PROGRESS', matrixId: 'mat1', matrixVersion: 1, assessmentId: 'ass1', enrollmentId: 'enr1', period: 'T1' \}\);/,
  `db.store.set('reports/rep_enr1_T1', { id: 'rep_enr1_T1', revision: 1, reportStatus: 'IN_PROGRESS', matrixId: 'mat1', matrixVersion: 1, assessmentId: 'ass1', enrollmentId: 'enr1', studentId: 'stu1', classId: 'cls1', schoolYear: '2026', period: 'T1' });`
);
code = code.replace(
  /db\.store\.set\('reports\/rep_enr2_T1', \{ id: 'rep_enr2_T1', revision: 1, reportStatus: 'IN_PROGRESS', matrixId: 'oldMat' \}\);/,
  `db.store.set('reports/rep_enr2_T1', { id: 'rep_enr2_T1', revision: 1, reportStatus: 'IN_PROGRESS', matrixId: 'oldMat', assessmentId: 'ass_enr2_mat1_T1', enrollmentId: 'enr2', studentId: 'stu2', classId: 'cls1', schoolYear: '2026', period: 'T1' });`
);
code = code.replace(
  /db\.store\.set\('assessments\/ass1', \{ id: 'ass1', answers: \{\} \}\);/,
  `db.store.set('assessments/ass1', { id: 'ass1', enrollmentId: 'enr1', studentId: 'stu1', classId: 'cls1', schoolYear: '2026', period: 'T1', matrixId: 'mat1', matrixVersion: 1, status: 'COMPLETED', answers: {} });`
);
code = code.replace(
  /db\.store\.set\('assessments\/ass_enr2_mat1_T1', \{ id: 'ass_enr2_mat1_T1', answers: \{ c1: 'A' \} \}\);/,
  `db.store.set('assessments/ass_enr2_mat1_T1', { id: 'ass_enr2_mat1_T1', enrollmentId: 'enr2', studentId: 'stu2', classId: 'cls1', schoolYear: '2026', period: 'T1', matrixId: 'mat1', matrixVersion: 1, answers: { c1: 'A' } });`
);
code = code.replace(
  /db\.store\.set\('reports\/rep_enr1_T1', \{ id: 'rep_enr1_T1', revision: 2, reportStatus: 'VALIDATED' \}\);/g,
  `db.store.set('reports/rep_enr1_T1', { id: 'rep_enr1_T1', revision: 2, reportStatus: 'VALIDATED', matrixId: 'mat1', matrixVersion: 1, assessmentId: 'ass1', enrollmentId: 'enr1', studentId: 'stu1', classId: 'cls1', schoolYear: '2026', period: 'T1', finalText: 'Valid final text' });`
);
fs.writeFileSync('tests/test-consolidated.ts', code);
