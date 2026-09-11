import assert from 'assert';
import { registerReportsRoutes } from './src/server-reports.js';

class MockTransaction {
  store;
  constructor(store) {
    this.store = store;
  }
  async get(ref) {
    const data = this.store.get(ref.path);
    return {
      exists: !!data,
      data: () => data
    };
  }
  set(ref, data) {
    this.store.set(ref.path, data);
  }
}

class MockDb {
  store = new Map();
  collection(name) {
    return {
      doc: (id) => ({
        path: `${name}/${id}`,
        get: async () => {
          const data = this.store.get(`${name}/${id}`);
          return { exists: !!data, data: () => data };
        }
      })
    };
  }
  async runTransaction(cb) {
    const t = new MockTransaction(this.store);
    return cb(t);
  }
}

async function runTest() {
  const db = new MockDb();
  let transferHandler: any = null;

  const mockApp = {
    post: (path: string, auth: any, handler: any) => {
      // Catch the correct route
      if (path === '/api/academic/reports/:reportId/transfer') {
        // If there are multiple middleware, the handler is the last one
        // Wait, the signature is app.post(path, authenticate, handler) OR app.post(path, auth, role, handler)
        // Let's capture the last argument which is the main handler
        transferHandler = arguments[arguments.length - 1]; 
      }
    }
  } as any;

  const mockAuthenticate = (req: any, res: any, next: any) => next();

  // Patching the arguments extraction since arrow function doesn't have 'arguments'
  mockApp.post = function() {
    if (arguments[0] === '/api/academic/reports/:reportId/transfer') {
      transferHandler = arguments[arguments.length - 1];
    }
  };

  registerReportsRoutes(mockApp, db as any, mockAuthenticate);
  assert.ok(transferHandler, 'Transfer route not registered');

  // Setup basic data
  db.store.set('users/user1', { role: 'MASTER' });
  db.store.set('classes/cls1', { id: 'cls1', brandId: 'GLOBAL', programId: 'ALL', gradeLevelId: 'gl1' });
  db.store.set('enrollments/enr1', { classId: 'cls1', studentId: 'stu1', schoolYear: '2026' });
  
  // Matriz válida
  db.store.set('matrices/mat_ok', {
    status: 'PUBLISHED',
    schoolYear: '2026',
    period: 'T1',
    brandId: 'GLOBAL',
    programId: 'ALL',
    gradeLevelId: 'gl1',
    version: 5,
    criteria: [{id: 'c1', required: true}]
  });
  
  // Matriz incompatível (ano errado)
  db.store.set('matrices/mat_bad_year', {
    status: 'PUBLISHED',
    schoolYear: '2027',
    period: 'T1',
    brandId: 'GLOBAL',
    programId: 'ALL',
    gradeLevelId: 'gl1'
  });

  // Relatório base
  db.store.set('reports/rep_enr1_T1', {
    id: 'rep_enr1_T1',
    revision: 1,
    reportStatus: 'IN_PROGRESS',
    assessmentId: 'ass_old',
    strengths: 'Forças',
    enrollmentId: 'enr1',
    studentId: 'stu1',
    classId: 'cls1',
    period: 'T1',
    schoolYear: '2026'
  });
  
  // Helper to call the route
  const invoke = async (body: any) => {
    let status = 200;
    let jsonRes: any = null;
    const req = {
      params: { reportId: 'rep_enr1_T1' },
      body,
      user: { uid: 'user1' }
    };
    const res = {
      status: (code: number) => { status = code; return res; },
      json: (data: any) => { jsonRes = data; return res; }
    };
    await transferHandler(req, res);
    return { status, json: jsonRes };
  };

  // 1. Matriz incompatível rejeitada
  const resBadYear = await invoke({ enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat_bad_year', expectedRevision: 1 });
  assert.strictEqual(resBadYear.status, 400);
  assert.strictEqual(resBadYear.json.error, 'Matriz incompatível com o ano letivo da matrícula.');
  
  // 2. Revisão desatualizada (409)
  const resConfl = await invoke({ enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat_ok', expectedRevision: 0 });
  assert.strictEqual(resConfl.status, 409);

  // 3. Matriz válida cria avaliação
  const resOk = await invoke({ enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat_ok', expectedRevision: 1 });
  assert.strictEqual(resOk.status, 200);
  assert.strictEqual(resOk.json.success, true);
  
  // Verificar escritas
  const savedRep = db.store.get('reports/rep_enr1_T1');
  assert.strictEqual(savedRep.matrixId, 'mat_ok');
  assert.strictEqual(savedRep.matrixVersion, 5);
  assert.strictEqual(savedRep.strengths, 'Forças'); // preservado
  
  const savedAss = db.store.get('assessments/ass_enr1_mat_ok_T1');
  assert.ok(savedAss);
  assert.strictEqual(savedAss.matrixVersion, 5);
  
  // 4. Avaliação existente mantém respostas
  db.store.set('reports/rep_enr1_T1', {
    id: 'rep_enr1_T1',
    revision: 2,
    reportStatus: 'IN_PROGRESS',
    assessmentId: 'ass_old',
    enrollmentId: 'enr1',
    studentId: 'stu1',
    classId: 'cls1',
    period: 'T1',
    schoolYear: '2026'
  });
  db.store.set('assessments/ass_enr1_mat_ok_T1', {
    id: 'ass_enr1_mat_ok_T1',
    enrollmentId: 'enr1',
    studentId: 'stu1',
    classId: 'cls1',
    schoolYear: '2026',
    period: 'T1',
    matrixId: 'mat_ok',
    matrixVersion: 5,
    answers: { c1: 'ED' },
    status: 'IN_PROGRESS'
  });
  
  const resOkExist = await invoke({ enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat_ok', expectedRevision: 2 });
  assert.strictEqual(resOkExist.status, 200);
  const preservedAss = db.store.get('assessments/ass_enr1_mat_ok_T1');
  assert.strictEqual(preservedAss.answers.c1, 'ED'); // kept

  // 5. Relatório com vínculos corrompidos
  db.store.set('reports/rep_enr1_T1', {
    id: 'rep_enr1_T1',
    revision: 3,
    reportStatus: 'IN_PROGRESS',
    assessmentId: 'ass_old',
    enrollmentId: 'enr1',
    studentId: 'DIFFERENT', // corrompido
    classId: 'cls1',
    period: 'T1',
    schoolYear: '2026'
  });
  const resBadLinks = await invoke({ enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat_ok', expectedRevision: 3 });
  assert.strictEqual(resBadLinks.status, 400);
  assert.strictEqual(resBadLinks.json.error, 'Relatório com vínculos corrompidos.');

  // 6. Relatório validado perde validação na transferência
  db.store.set('reports/rep_enr1_T1', {
    id: 'rep_enr1_T1',
    revision: 4,
    reportStatus: 'VALIDATED',
    assessmentId: 'ass_old',
    enrollmentId: 'enr1',
    studentId: 'stu1',
    classId: 'cls1',
    period: 'T1',
    schoolYear: '2026',
    validatedBy: 'userX',
    validatedAt: 1234
  });
  db.store.delete('assessments/ass_enr1_mat_ok_T1'); // force recreate
  
  const resValidated = await invoke({ enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat_ok', expectedRevision: 4 });
  assert.strictEqual(resValidated.status, 200);
  const repAfterVal = db.store.get('reports/rep_enr1_T1');
  assert.strictEqual(repAfterVal.reportStatus, 'NOT_STARTED'); // Recalculated based on empty target
  assert.strictEqual(repAfterVal.validatedBy, undefined); // Cleared
  assert.strictEqual(repAfterVal.validatedAt, undefined); // Cleared

  // Verifica o histórico criado no MockTransaction
  let foundAudit = false;
  for (const [key, val] of db.store.entries()) {
    if (key.startsWith('auditLogs/') && (val as any).action === 'REPORT_INVALIDATED_BY_MATRIX_TRANSFER') {
      foundAudit = true;
      break;
    }
  }
  assert.ok(foundAudit, 'Audit log REPORT_INVALIDATED_BY_MATRIX_TRANSFER should have been created');
  
  console.log("All real-route tests passed");
}

runTest().catch(e => {
  console.error(e);
  process.exit(1);
});
