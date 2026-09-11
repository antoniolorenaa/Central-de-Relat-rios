import assert from 'assert';
import { registerReportsRoutes } from './src/server-reports.js';

class MockTransaction {
  originalStore;
  writes = [];
  reading = true;

  constructor(originalStore) {
    this.originalStore = originalStore;
  }

  async get(ref) {
    if (!this.reading) throw new Error('Reads are not allowed after writes have started.');
    const data = this.originalStore.get(ref.path);
    return {
      exists: !!data,
      data: () => data ? JSON.parse(JSON.stringify(data)) : undefined // return a copy
    };
  }

  set(ref, data) {
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
  store = new Map();
  auditCounter = 1;

  collection(name) {
    return {
      doc: (id) => {
        if (!id) {
          id = `auto_id_${this.auditCounter++}`;
        }
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

  async runTransaction(cb) {
    const t = new MockTransaction(this.store);
    try {
      const result = await cb(t);
      t.commit();
      return result;
    } catch (e) {
      throw e;
    }
  }
}

async function runTest() {
  const db = new MockDb();
  let validateHandler: any = null;

  const mockApp = {
    post: (path: string, auth: any, ...handlers: any[]) => {
      if (path === '/api/academic/reports/:reportId/validate') {
        validateHandler = handlers[handlers.length - 1]; 
      }
    }
  } as any;

  const mockAuthenticate = (req: any, res: any, next: any) => next();

  registerReportsRoutes(mockApp, db as any, mockAuthenticate);
  assert.ok(validateHandler, 'Validate route not registered');

  // Helper to call the route
  const invoke = async (body: any) => {
    let status = 200;
    let jsonRes: any = null;
    const req = {
      params: { reportId: 'rep_enr1_T1' },
      body,
      user: { uid: 'user_master' } // Require coordination or master handled loosely by our mock
    };
    const res = {
      status: (code: number) => { status = code; return res; },
      json: (data: any) => { jsonRes = data; return res; }
    };
    await validateHandler(req, res);
    return { status, json: jsonRes };
  };

  // Basic Setup
  db.store.set('users/user_master', { role: 'MASTER' });
  db.store.set('classes/cls1', { id: 'cls1', brandId: 'GLOBAL', programId: 'ALL', gradeLevelId: 'gl1' });
  db.store.set('enrollments/enr1', { classId: 'cls1', studentId: 'stu1', schoolYear: '2026' });

  db.store.set('assessments/ass_enr1_mat_ok_T1', {
    id: 'ass_enr1_mat_ok_T1',
    enrollmentId: 'enr1',
    studentId: 'stu1',
    classId: 'cls1',
    schoolYear: '2026',
    period: 'T1',
    matrixId: 'mat_ok',
    matrixVersion: 5,
    answers: { c1: 'D' },
    status: 'COMPLETED',
    revision: 10
  });

  db.store.set('reports/rep_enr1_T1', {
    id: 'rep_enr1_T1',
    revision: 1,
    reportStatus: 'READY_FOR_REVIEW',
    assessmentId: 'ass_enr1_mat_ok_T1',
    strengths: '',
    enrollmentId: 'enr1',
    studentId: 'stu1',
    classId: 'cls1',
    period: 'T1',
    schoolYear: '2026',
    matrixId: 'mat_ok',
    matrixVersion: 5
  });

  // 1. Valid approval and persistence of 4 texts
  const resOk = await invoke({
    enrollmentId: 'enr1', period: 'T1', assessmentId: 'ass_enr1_mat_ok_T1',
    expectedRevision: 1,
    strengths: 'Força A', developmentAspects: 'Des A', additionalInformation: 'Info A', finalText: 'Parecer A'
  });
  assert.strictEqual(resOk.status, 200, resOk.json?.error);

  // 3. Revisão inválida/desatualizada
  db.store.set('reports/rep_enr1_T1', {
    ...db.store.get('reports/rep_enr1_T1'),
    reportStatus: 'READY_FOR_REVIEW',
    revision: 3
  });
  
  const resBadRev = await invoke({ enrollmentId: 'enr1', period: 'T1', assessmentId: 'ass_enr1_mat_ok_T1', expectedRevision: -1 });
  assert.strictEqual(resBadRev.status, 400);
  
  const resConfl = await invoke({ enrollmentId: 'enr1', period: 'T1', assessmentId: 'ass_enr1_mat_ok_T1', expectedRevision: 2 });
  assert.strictEqual(resConfl.status, 409);

  // NEW TESTS
  // 7. matrixId null nos dois documentos
  db.store.set('reports/rep_enr1_T1', {
    ...db.store.get('reports/rep_enr1_T1'),
    matrixId: null,
    matrixVersion: 5
  });
  db.store.set('assessments/ass_enr1_mat_ok_T1', {
    ...db.store.get('assessments/ass_enr1_mat_ok_T1'),
    matrixId: null,
    matrixVersion: 5
  });
  const resNullMatrix = await invoke({ enrollmentId: 'enr1', period: 'T1', assessmentId: 'ass_enr1_mat_ok_T1', expectedRevision: 3 });
  assert.strictEqual(resNullMatrix.status, 400);
  assert.ok(resNullMatrix.json.error.includes('campos estruturais'), 'Deveria barrar matrixId nulo');

  // 8. matrixId vazio nos dois documentos
  db.store.set('reports/rep_enr1_T1', {
    ...db.store.get('reports/rep_enr1_T1'),
    matrixId: '   ', // vazio
    matrixVersion: 5
  });
  db.store.set('assessments/ass_enr1_mat_ok_T1', {
    ...db.store.get('assessments/ass_enr1_mat_ok_T1'),
    matrixId: '  ' // vazio
  });
  const resEmptyMatrix = await invoke({ enrollmentId: 'enr1', period: 'T1', assessmentId: 'ass_enr1_mat_ok_T1', expectedRevision: 3 });
  assert.strictEqual(resEmptyMatrix.status, 400);
  assert.ok(resEmptyMatrix.json.error.includes('campos estruturais'), 'Deveria barrar matrixId vazio');

  // 9. matrixVersion null nos dois documentos
  db.store.set('reports/rep_enr1_T1', {
    ...db.store.get('reports/rep_enr1_T1'),
    matrixId: 'mat_ok',
    matrixVersion: null
  });
  db.store.set('assessments/ass_enr1_mat_ok_T1', {
    ...db.store.get('assessments/ass_enr1_mat_ok_T1'),
    matrixId: 'mat_ok',
    matrixVersion: null
  });
  const resNullVersion = await invoke({ enrollmentId: 'enr1', period: 'T1', assessmentId: 'ass_enr1_mat_ok_T1', expectedRevision: 3 });
  assert.strictEqual(resNullVersion.status, 400);
  assert.ok(resNullVersion.json.error.includes('campos estruturais'), 'Deveria barrar matrixVersion nulo');

  console.log("All real validate struct tests passed");
}

runTest().catch(e => {
  console.error(e);
  process.exit(1);
});
