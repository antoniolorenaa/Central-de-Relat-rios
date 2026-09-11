import assert from 'assert';
import { registerReportsRoutes } from './src/server-reports.js';

class MockTransaction {
  originalStore: Map<string, any>;
  writes: any[] = [];
  reading = true;

  constructor(originalStore: Map<string, any>) {
    this.originalStore = originalStore;
  }

  async get(ref: { path: string }) {
    if (!this.reading) throw new Error('Reads are not allowed after writes have started.');
    const data = this.originalStore.get(ref.path);
    return {
      exists: !!data,
      data: () => data ? JSON.parse(JSON.stringify(data)) : undefined // copy
    };
  }

  set(ref: { path: string }, data: any) {
    this.reading = false;
    this.writes.push({ ref, data: JSON.parse(JSON.stringify(data)) });
  }

  commit() {
    for (const w of this.writes) {
      this.originalStore.set(w.ref.path, w.data);
    }
  }
}

class MockDb {
  store = new Map<string, any>();
  auditCounter = 1;

  collection(name: string) {
    return {
      doc: (id?: string) => {
        if (!id) id = `auto_id_${this.auditCounter++}`;
        return {
          path: `${name}/${id}`,
          get: async () => {
            const data = this.store.get(`${name}/${id}`);
            return { exists: !!data, data: () => data ? JSON.parse(JSON.stringify(data)) : undefined };
          }
        };
      }
    };
  }

  async runTransaction(cb: (t: any) => Promise<any>) {
    const t = new MockTransaction(this.store);
    try {
      const result = await cb(t);
      t.commit();
      return result;
    } catch (e) {
      throw e; // discard writes on error
    }
  }
}

async function runTest() {
  const db = new MockDb();
  let transferHandler: any = null;
  let validateHandler: any = null;

  const mockApp = {
    post: (path: string, auth: any, ...handlers: any[]) => {
      if (path === '/api/academic/reports/:reportId/transfer') transferHandler = handlers[handlers.length - 1];
      if (path === '/api/academic/reports/:reportId/validate') validateHandler = handlers[handlers.length - 1];
    }
  } as any;

  const mockAuthenticate = (req: any, res: any, next: any) => next();
  registerReportsRoutes(mockApp, db as any, mockAuthenticate);
  assert.ok(transferHandler, 'Transfer route not registered');
  assert.ok(validateHandler, 'Validate route not registered');

  const invoke = async (handler: any, body: any) => {
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
    await handler(req, res);
    return { status, json: jsonRes };
  };

  const invokeTransfer = (body: any) => invoke(transferHandler, body);
  const invokeValidate = (body: any) => invoke(validateHandler, body);

  // BASELINE DATA RESETTERS
  const resetTransfer = () => {
    db.store.clear();
    db.auditCounter = 1;
    db.store.set('users/user1', { role: 'MASTER' });
    db.store.set('classes/cls1', { id: 'cls1', brandId: 'GLOBAL', programId: 'ALL', gradeLevelId: 'gl1', schoolYear: '2026' });
    db.store.set('enrollments/enr1', { classId: 'cls1', studentId: 'stu1', schoolYear: '2026' });
    db.store.set('matrices/mat_ok', {
      status: 'PUBLISHED', schoolYear: '2026', period: 'T1', brandId: 'GLOBAL', programId: 'ALL', gradeLevelId: 'gl1', version: 5, criteria: [{id: 'c1', required: true}]
    });
    db.store.set('matrices/mat_bad_year', {
      status: 'PUBLISHED', schoolYear: '2027', period: 'T1', brandId: 'GLOBAL', programId: 'ALL', gradeLevelId: 'gl1'
    });
    db.store.set('reports/rep_enr1_T1', {
      id: 'rep_enr1_T1', revision: 1, reportStatus: 'IN_PROGRESS', assessmentId: 'ass_old', strengths: 'Forças',
      enrollmentId: 'enr1', studentId: 'stu1', classId: 'cls1', period: 'T1', schoolYear: '2026'
    });
  };

  const resetValidate = () => {
    db.store.clear();
    db.auditCounter = 1;
    db.store.set('users/user1', { role: 'MASTER' });
    db.store.set('classes/cls1', { id: 'cls1', brandId: 'GLOBAL', programId: 'ALL', gradeLevelId: 'gl1', schoolYear: '2026' });
    db.store.set('enrollments/enr1', { classId: 'cls1', studentId: 'stu1', schoolYear: '2026' });
    db.store.set('assessments/ass_enr1_mat_ok_T1', {
      id: 'ass_enr1_mat_ok_T1', enrollmentId: 'enr1', studentId: 'stu1', classId: 'cls1', schoolYear: '2026', period: 'T1',
      matrixId: 'mat_ok', matrixVersion: 5, answers: { c1: 'D' }, status: 'COMPLETED', revision: 10
    });
    db.store.set('reports/rep_enr1_T1', {
      id: 'rep_enr1_T1', revision: 1, reportStatus: 'READY_FOR_REVIEW', assessmentId: 'ass_enr1_mat_ok_T1', strengths: '',
      enrollmentId: 'enr1', studentId: 'stu1', classId: 'cls1', period: 'T1', schoolYear: '2026', matrixId: 'mat_ok', matrixVersion: 5
    });
  };

  // --- TRANSFER SCENARIOS ---
  console.log('Running Transfer Scenarios...');
  
  // T1: Incompatible matrix
  resetTransfer();
  let res = await invokeTransfer({ enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat_bad_year', expectedRevision: 1 });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.json.error, 'Matriz incompatível com o ano letivo da matrícula.');

  // T2: Invalid revision type
  resetTransfer();
  res = await invokeTransfer({ enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat_ok', expectedRevision: -1 });
  assert.strictEqual(res.status, 400);
  res = await invokeTransfer({ enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat_ok', expectedRevision: "1" });
  assert.strictEqual(res.status, 400);
  res = await invokeTransfer({ enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat_ok', expectedRevision: 1.5 });
  assert.strictEqual(res.status, 400);

  // T3: Outdated revision
  resetTransfer();
  res = await invokeTransfer({ enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat_ok', expectedRevision: 0 });
  assert.strictEqual(res.status, 409);

  // T4: Valid transfer
  resetTransfer();
  res = await invokeTransfer({ enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat_ok', expectedRevision: 1 });
  assert.strictEqual(res.status, 200, res.json.error);
  let rep = db.store.get('reports/rep_enr1_T1');
  assert.strictEqual(rep.matrixId, 'mat_ok');
  assert.strictEqual(rep.strengths, 'Forças'); // texts preserved
  assert.ok(db.store.get('assessments/ass_enr1_mat_ok_T1')); // new assessment created

  // T5: Existing assessment keeps answers
  resetTransfer();
  db.store.set('assessments/ass_enr1_mat_ok_T1', {
     id: 'ass_enr1_mat_ok_T1', enrollmentId: 'enr1', studentId: 'stu1', classId: 'cls1', schoolYear: '2026', period: 'T1', matrixId: 'mat_ok', matrixVersion: 5, answers: { c1: 'D' }, status: 'IN_PROGRESS'
  });
  res = await invokeTransfer({ enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat_ok', expectedRevision: 1 });
  assert.strictEqual(res.status, 200);
  let ass = db.store.get('assessments/ass_enr1_mat_ok_T1');
  assert.strictEqual(ass.answers.c1, 'D'); // answer kept

  // T6: Corrupted report links
  resetTransfer();
  db.store.set('reports/rep_enr1_T1', { ...db.store.get('reports/rep_enr1_T1'), studentId: 'DIFFERENT' });
  res = await invokeTransfer({ enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat_ok', expectedRevision: 1 });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.json.error, 'Relatório com vínculos corrompidos.');

  // T7: Validated report loses validation + logs
  resetTransfer();
  db.store.set('reports/rep_enr1_T1', { ...db.store.get('reports/rep_enr1_T1'), reportStatus: 'VALIDATED', validatedBy: 'userX', validatedAt: 1234 });
  res = await invokeTransfer({ enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat_ok', expectedRevision: 1 });
  assert.strictEqual(res.status, 200);
  rep = db.store.get('reports/rep_enr1_T1');
  assert.strictEqual(rep.reportStatus, 'IN_PROGRESS'); // Status recalculated (has 'Forças')
  assert.strictEqual(rep.validatedBy, undefined);
  assert.ok(Array.from(db.store.values()).find(v => v.action === 'REPORT_INVALIDATED_BY_MATRIX_TRANSFER'));

  // --- VALIDATE SCENARIOS ---
  console.log('Running Validate Scenarios...');

  // V1: Valid approval + 4 texts persistence
  resetValidate();
  res = await invokeValidate({ enrollmentId: 'enr1', period: 'T1', assessmentId: 'ass_enr1_mat_ok_T1', expectedRevision: 1, strengths: 'Força A', developmentAspects: 'Des A', additionalInformation: 'Info A', finalText: 'Parecer A' });
  assert.strictEqual(res.status, 200, res.json.error);
  rep = db.store.get('reports/rep_enr1_T1');
  assert.strictEqual(rep.reportStatus, 'VALIDATED');
  assert.strictEqual(rep.strengths, 'Força A');

  // V2: Already validated + divergent text
  res = await invokeValidate({ enrollmentId: 'enr1', period: 'T1', assessmentId: 'ass_enr1_mat_ok_T1', expectedRevision: 2, strengths: 'Divergent' });
  assert.strictEqual(res.status, 400);
  assert.ok(res.json.error.includes('não aceita alterações de texto'));

  // V3: Already validated + identical
  res = await invokeValidate({ enrollmentId: 'enr1', period: 'T1', assessmentId: 'ass_enr1_mat_ok_T1', expectedRevision: 2 });
  assert.strictEqual(res.status, 200); // no error

  // V4: Invalid revision type
  resetValidate();
  res = await invokeValidate({ enrollmentId: 'enr1', period: 'T1', assessmentId: 'ass_enr1_mat_ok_T1', expectedRevision: -1 });
  assert.strictEqual(res.status, 400);

  // V5: Outdated revision
  res = await invokeValidate({ enrollmentId: 'enr1', period: 'T1', assessmentId: 'ass_enr1_mat_ok_T1', expectedRevision: 0 });
  assert.strictEqual(res.status, 409);

  // V6: Missing assessment
  resetValidate();
  db.store.set('reports/rep_enr1_T1', { ...db.store.get('reports/rep_enr1_T1'), assessmentId: 'ass_missing' });
  res = await invokeValidate({ enrollmentId: 'enr1', period: 'T1', assessmentId: 'ass_missing', expectedRevision: 1 });
  assert.strictEqual(res.status, 404);

  // V7: Divergent report links
  resetValidate();
  db.store.set('reports/rep_enr1_T1', { ...db.store.get('reports/rep_enr1_T1'), matrixId: 'corrupted' });
  res = await invokeValidate({ enrollmentId: 'enr1', period: 'T1', assessmentId: 'ass_enr1_mat_ok_T1', expectedRevision: 1 });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.json.error, 'Vínculos inconsistentes no relatório.');

  // V8: Invalid text (empty string)
  resetValidate();
  res = await invokeValidate({ enrollmentId: 'enr1', period: 'T1', assessmentId: 'ass_enr1_mat_ok_T1', expectedRevision: 1, finalText: '   ' });
  assert.strictEqual(res.status, 400);
  assert.ok(res.json.error.includes('Parecer não pode estar vazio'));

  // V9: Invalid text type
  resetValidate();
  res = await invokeValidate({ enrollmentId: 'enr1', period: 'T1', assessmentId: 'ass_enr1_mat_ok_T1', expectedRevision: 1, finalText: 123 });
  assert.strictEqual(res.status, 400);
  assert.ok(res.json.error.includes('devem ser strings'));

  // V10: matrixId null nos dois
  resetValidate();
  db.store.set('reports/rep_enr1_T1', { ...db.store.get('reports/rep_enr1_T1'), matrixId: null });
  db.store.set('assessments/ass_enr1_mat_ok_T1', { ...db.store.get('assessments/ass_enr1_mat_ok_T1'), matrixId: null });
  res = await invokeValidate({ enrollmentId: 'enr1', period: 'T1', assessmentId: 'ass_enr1_mat_ok_T1', expectedRevision: 1 });
  assert.strictEqual(res.status, 400);
  assert.ok(res.json.error.includes('campos estruturais ausentes ou inválidos'), res.json.error);

  // V11: matrixId empty nos dois
  resetValidate();
  db.store.set('reports/rep_enr1_T1', { ...db.store.get('reports/rep_enr1_T1'), matrixId: '   ' });
  db.store.set('assessments/ass_enr1_mat_ok_T1', { ...db.store.get('assessments/ass_enr1_mat_ok_T1'), matrixId: '   ' });
  res = await invokeValidate({ enrollmentId: 'enr1', period: 'T1', assessmentId: 'ass_enr1_mat_ok_T1', expectedRevision: 1 });
  assert.strictEqual(res.status, 400);
  assert.ok(res.json.error.includes('campos estruturais ausentes ou inválidos'), res.json.error);

  // V12: matrixVersion null nos dois
  resetValidate();
  db.store.set('reports/rep_enr1_T1', { ...db.store.get('reports/rep_enr1_T1'), matrixVersion: null });
  db.store.set('assessments/ass_enr1_mat_ok_T1', { ...db.store.get('assessments/ass_enr1_mat_ok_T1'), matrixVersion: null });
  res = await invokeValidate({ enrollmentId: 'enr1', period: 'T1', assessmentId: 'ass_enr1_mat_ok_T1', expectedRevision: 1 });
  assert.strictEqual(res.status, 400);
  assert.ok(res.json.error.includes('campos estruturais ausentes ou inválidos'), res.json.error);

  console.log("ALL CONSOLIDATED TESTS PASSED SUCCESSFULLY");
}

runTest().catch(e => {
  console.error(e);
  process.exit(1);
});
