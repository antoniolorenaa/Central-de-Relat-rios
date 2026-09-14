const fs = require('fs');
let code = fs.readFileSync('tests/test-consolidated.ts', 'utf8');

const newSetup = `
  const setupDB = () => {
    db.store.clear();
    db.store.set('users/user1', { role: 'MASTER' });
    db.store.set('users/user2', { role: 'TEACHER' });
    
    db.store.set('classes/cls1', { id: 'cls1', gradeLevelId: 'grade1', brandId: 'b1', programId: 'p1' });
    
    db.store.set('enrollments/enr1', { id: 'enr1', studentId: 'stu1', classId: 'cls1', schoolYear: '2026' });
    db.store.set('enrollments/enr2', { id: 'enr2', studentId: 'stu2', classId: 'cls1', schoolYear: '2026' });
    
    db.store.set('matrices/mat1', { status: 'PUBLISHED', schoolYear: '2026', period: 'T1', gradeLevelId: 'grade1', brandId: 'GLOBAL', programId: 'ALL', version: 1, criteria: [{ id: 'c1', required: true }] });
    
    db.store.set('reports/rep_enr1_T1', { id: 'rep_enr1_T1', revision: 1, reportStatus: 'IN_PROGRESS', matrixId: 'mat1', matrixVersion: 1, assessmentId: 'ass1', enrollmentId: 'enr1', period: 'T1' });
    db.store.set('assessments/ass1', { id: 'ass1', answers: {} });
  };
`;

code = code.replace(
  /const setupDB = \(\) => \{[\s\S]*?\}\;/m,
  newSetup.trim()
);

// fix save missing properties:
// in Save tests, wait, Save expects the payload to include assessmentId ?
// Let's check test 13: Save Cria se não existir
code = code.replace(
  /\{ enrollmentId: 'enr3', period: 'T1', matrixId: 'mat1', matrixVersion: 1, expectedRevision: 0, payload: \{ answers: \{ c1: 'S' \} \} \}/g,
  `{ enrollmentId: 'enr3', period: 'T1', matrixId: 'mat1', matrixVersion: 1, expectedRevision: 0, assessmentId: 'ass_enr3', payload: { answers: { c1: 'S' } } }`
);

code = code.replace(
  /\{ enrollmentId: 'enr1', period: 'T1', matrixId: 'mat1', matrixVersion: 1, expectedRevision: 1, payload: \{ answers: \{ c1: 'NS' \} \} \}/g,
  `{ enrollmentId: 'enr1', period: 'T1', matrixId: 'mat1', matrixVersion: 1, expectedRevision: 1, assessmentId: 'ass1', payload: { answers: { c1: 'NS' } } }`
);

code = code.replace(
  /\{ enrollmentId: 'enr1', period: 'T1', matrixId: 'mat1', matrixVersion: 1, expectedRevision: 1, payload: \{ strengths: 'Wow', answers: \{\} \} \}/g,
  `{ enrollmentId: 'enr1', period: 'T1', matrixId: 'mat1', matrixVersion: 1, expectedRevision: 1, assessmentId: 'ass1', payload: { strengths: 'Wow', answers: {} } }`
);

code = code.replace(
  /\{ enrollmentId: 'enr1', period: 'T1', matrixId: 'mat1', matrixVersion: 1, expectedRevision: 99, payload: \{ answers: \{\} \} \}/g,
  `{ enrollmentId: 'enr1', period: 'T1', matrixId: 'mat1', matrixVersion: 1, expectedRevision: 99, assessmentId: 'ass1', payload: { answers: {} } }`
);

fs.writeFileSync('tests/test-consolidated.ts', code);
