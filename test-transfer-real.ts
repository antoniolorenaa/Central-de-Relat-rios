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

  db.store.set('users/user1', { role: 'MASTER' });
  db.store.set('classes/cls1', { id: 'cls1', brandId: 'GLOBAL', programId: 'ALL', gradeLevelId: 'gl1' });
  db.store.set('enrollments/enr1', { classId: 'cls1', studentId: 'stu1', schoolYear: '2026' });

  db.store.set('reports/rep_enr1_T1', {
    id: 'rep_enr1_T1',
    revision: 1,
    reportStatus: 'IN_PROGRESS',
    assessmentId: 'ass_old',
    enrollmentId: 'enr1',
    studentId: 'stu1',
    classId: 'cls1',
    period: 'T1',
    schoolYear: '2026'
  });

  // 1. Valid Revision
  const resConfl = await invoke({ enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat_ok', expectedRevision: 0 });
  assert.strictEqual(resConfl.status, 409); // Valid type, but outdated -> 409
  
  // 2. Invalid Revision types
  const resBadType1 = await invoke({ enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat_ok', expectedRevision: -1 });
  assert.strictEqual(resBadType1.status, 400); // negative
  
  const resBadType2 = await invoke({ enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat_ok', expectedRevision: "1" });
  assert.strictEqual(resBadType2.status, 400); // string

  const resBadType3 = await invoke({ enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat_ok', expectedRevision: 1.5 });
  assert.strictEqual(resBadType3.status, 400); // decimal
  
  console.log("All transfer real revision checks passed");
}

runTest().catch(e => {
  console.error(e);
  process.exit(1);
});
