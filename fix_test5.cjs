const fs = require('fs');
let code = fs.readFileSync('tests/test-consolidated.ts', 'utf8');

// For Validate and Reopen, we need to pass enrollmentId and period
code = code.replace(
  /\{ expectedRevision: 1 \}, \s*\n\s*\{ reportId: 'rep_missing' \}/g,
  `{ enrollmentId: 'missing', period: 'T1', expectedRevision: 1 }, { reportId: 'rep_missing_T1' }`
);

code = code.replace(
  /\{ expectedRevision: 99 \}, \s*\n\s*\{ reportId: 'rep_enr1_T1' \}/g,
  `{ enrollmentId: 'enr1', period: 'T1', expectedRevision: 99 }, { reportId: 'rep_enr1_T1' }`
);

code = code.replace(
  /\{ expectedRevision: 1 \}, \s*\n\s*\{ reportId: 'rep_enr1_T1' \}/g,
  `{ enrollmentId: 'enr1', period: 'T1', expectedRevision: 1 }, { reportId: 'rep_enr1_T1' }`
);

// wait, test 11 uses expectedRevision: 2
code = code.replace(
  /\{ expectedRevision: 2 \}, \s*\n\s*\{ reportId: 'rep_enr1_T1' \}/g,
  `{ enrollmentId: 'enr1', period: 'T1', expectedRevision: 2 }, { reportId: 'rep_enr1_T1' }`
);

// test 18
code = code.replace(
  /mockReqRes\(\{ expectedRevision: 1 \}, \{ reportId: 'rep_enr1_T1' \}\)/g,
  `mockReqRes({ enrollmentId: 'enr1', period: 'T1', expectedRevision: 1 }, { reportId: 'rep_enr1_T1' })`
);

// test 13: status NOT_STARTED instead of IN_PROGRESS
// save route:
code = code.replace(
  /\{ enrollmentId: 'enr3', period: 'T1', matrixId: 'mat1', matrixVersion: 1, expectedRevision: 0, assessmentId: 'ass_enr3', payload: \{ answers: \{ c1: 'S' \} \} \}/g,
  `{ enrollmentId: 'enr3', period: 'T1', matrixId: 'mat1', matrixVersion: 1, expectedRevision: 0, assessmentId: 'ass_enr3_mat1_T1', payload: { answers: { c1: 'S' } } }`
);

fs.writeFileSync('tests/test-consolidated.ts', code);
