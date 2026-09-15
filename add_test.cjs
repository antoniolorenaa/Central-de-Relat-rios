const fs = require('fs');
let code = fs.readFileSync('tests/test-consolidated.ts', 'utf8');

const testCode = `
  await runTest("11. Reopen: AssessmentId divergente no payload retorna 400", async () => {
    db.store.set('reports/rep_enr1_T1', { ...db.store.get('reports/rep_enr1_T1'), reportStatus: 'VALIDATED' });
    const originalRevision = db.store.get('reports/rep_enr1_T1').revision;
    const { statusCode } = await invokeRoute('/api/academic/reports/rep_enr1_T1/reopen', { reportId: 'rep_enr1_T1' }, { period: 'T1', enrollmentId: 'enr1', assessmentId: 'other_ass', expectedRevision: originalRevision });
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(db.store.get('reports/rep_enr1_T1').reportStatus, 'VALIDATED');
  });
`;

code = code.replace(/console\.log\(\`\\nResults:/, testCode + '\n  console.log(`\\nResults:');

fs.writeFileSync('tests/test-consolidated.ts', code);
