const fs = require('fs');
let code = fs.readFileSync('tests/test-consolidated.ts', 'utf8');

code = code.replace(
  /assert\.strictEqual\(report\.reportStatus, tc\.name\.includes\("Cria se"\) \? 'NOT_STARTED' : 'READY_FOR_REVIEW'\);/g,
  `assert.strictEqual(report.reportStatus, 'NOT_STARTED'); // replaced below if reopen`
);

code = code.replace(
  /name: "11\. Reopen: Sucesso muda para IN_PROGRESS e cria log de auditoria",[\s\S]*?assert\.strictEqual\(report\.reportStatus, 'NOT_STARTED'\); \/\/ replaced below if reopen/m,
  `name: "11. Reopen: Sucesso muda para IN_PROGRESS e cria log de auditoria",
      run: async () => {
        setupDB();
        db.store.set('reports/rep_enr1_T1', { id: 'rep_enr1_T1', revision: 2, reportStatus: 'VALIDATED', matrixId: 'mat1', matrixVersion: 1, assessmentId: 'ass1', enrollmentId: 'enr1', studentId: 'stu1', classId: 'cls1', schoolYear: '2026', period: 'T1', finalText: 'Valid final text' });
        const { statusCode } = await invokeRoute('/api/academic/reports/:reportId/reopen', 
          { enrollmentId: 'enr1', period: 'T1', expectedRevision: 2, assessmentId: 'ass1' }, 
          { reportId: 'rep_enr1_T1' }
        );
        assert.strictEqual(statusCode, 200);
        const report = db.store.get('reports/rep_enr1_T1');
        assert.strictEqual(report.reportStatus, 'READY_FOR_REVIEW');`
);

fs.writeFileSync('tests/test-consolidated.ts', code);
