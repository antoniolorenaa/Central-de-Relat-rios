import assert from 'assert';
import { registerReportsRoutes } from '../src/server-reports';

const app = {
  routes: [] as any[],
  post: function(path: string, ...handlers: any[]) {
    this.routes.push({ path, handlers });
  }
};

const mockReqRes = (body: any, params: any) => {
  const req = { body, params, user: { uid: 'user1' } };
  let statusCode = 200;
  let responseData: any = null;
  const res = {
    status: (code: number) => { statusCode = code; return res; },
    json: (data: any) => { responseData = data; return res; },
    send: (data: any) => { responseData = data; return res; }
  };
  return { req, res, getResult: () => ({ statusCode, responseData }) };
};

// Deep copy helper to avoid mutating store values directly
const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

class MockCollection {
  constructor(public path: string, private store: Map<string, any>) {}
  doc(id?: string) {
    const docId = id || 'random-id-' + Math.random();
    const fullPath = this.path + '/' + docId;
    return {
      id: docId,
      path: fullPath,
      get: async () => {
        const exists = this.store.has(fullPath);
        return { 
          exists, 
          data: () => exists ? clone(this.store.get(fullPath)) : undefined, 
          ref: { path: fullPath } 
        };
      },
      set: async (data: any) => { 
        this.store.set(fullPath, clone(data)); 
      }
    };
  }
}

class MockFirestore {
  store = new Map<string, any>();
  collection(name: string) { return new MockCollection(name, this.store); }
  
  async runTransaction(cb: (t: any) => Promise<any>) {
    const transactionWrites = new Map<string, any>();
    let hasWrites = false;

    const transaction = {
      get: async (ref: any) => {
        if (hasWrites) throw new Error("Transaction reads after writes are rejected.");
        const exists = this.store.has(ref.path);
        return { 
          exists, 
          data: () => exists ? clone(this.store.get(ref.path)) : undefined,
          ref: { path: ref.path }
        };
      },
      set: (ref: any, data: any) => { 
        hasWrites = true;
        transactionWrites.set(ref.path, clone(data)); 
      }
    };

    const result = await cb(transaction);
    
    for (const [path, data] of transactionWrites.entries()) {
      this.store.set(path, data);
    }
    return result;
  }
}

const db = new MockFirestore();
const authenticate = (req: any, res: any, next: any) => { req.user = req.user || { uid: 'user1' }; next(); };
registerReportsRoutes(app as any, db as any, authenticate);

const invokeRoute = async (path: string, params: any, body: any) => {
  const route = app.routes.find(r => {
    const routeParts = r.path.split('/');
    const reqParts = path.split('/');
    if (routeParts.length !== reqParts.length) return false;
    return routeParts.every((p: string, i: number) => p.startsWith(':') || p === reqParts[i]);
  });
  if (!route) throw new Error("Route not found: " + path);
  
  const { req, res, getResult } = mockReqRes(body, params);
  try {
    for (const handler of route.handlers) {
      let nextCalled = false;
      await handler(req, res, () => { nextCalled = true; });
      if (!nextCalled) break;
    }
  } catch(e) {}
  
  return getResult();
};

const setupDB = () => {
  db.store.clear();
  db.store.set('users/user1', { role: 'MASTER' });
  db.store.set('classes/cls1', { id: 'cls1', gradeLevelId: 'grade1', brandId: 'b1', programId: 'p1', schoolYear: '2026' });
  db.store.set('enrollments/enr1', { id: 'enr1', studentId: 'stu1', classId: 'cls1', schoolYear: '2026' });
  db.store.set('matrices/mat1', { status: 'PUBLISHED', schoolYear: '2026', period: 'T1', gradeLevelId: 'grade1', brandId: 'GLOBAL', programId: 'ALL', version: 1, criteria: [] });
  db.store.set('assessments/ass1', { id: 'ass1', enrollmentId: 'enr1', studentId: 'stu1', classId: 'cls1', schoolYear: '2026', period: 'T1', matrixId: 'mat1', matrixVersion: 1, status: 'COMPLETED', revision: 1, answers: {} });
  db.store.set('reports/rep_enr1_T1', { 
    id: 'rep_enr1_T1', revision: 2, reportStatus: 'IN_PROGRESS', 
    matrixId: 'mat1', matrixVersion: 1, assessmentId: 'ass1', 
    enrollmentId: 'enr1', studentId: 'stu1', classId: 'cls1', 
    schoolYear: '2026', period: 'T1', finalText: 'Valid' 
  });
};

async function run() {
  console.log("Running new rules...");
  
  setupDB();
  for (const rev of [undefined, -1, 1.5, "2", null]) {
    const { statusCode } = await invokeRoute('/api/academic/reports/rep_enr1_T1', { reportId: 'rep_enr1_T1' }, {
      period: 'T1', enrollmentId: 'enr1', assessmentId: 'ass1', expectedRevision: rev
    });
    assert.strictEqual(statusCode, 400, "Should reject revision: " + rev);
  }
  
  setupDB();
  const { statusCode: sc2 } = await invokeRoute('/api/academic/reports/rep_enr1_T1', { reportId: 'rep_enr1_T1' }, {
    period: 'T1', enrollmentId: 'enr1', assessmentId: 'other_ass', expectedRevision: 2
  });
  assert.strictEqual(sc2, 400, "Should reject link change via normal save");

  setupDB();
  db.store.set('assessments/ass1', { ...db.store.get('assessments/ass1'), revision: -1 }); 
  const { statusCode: sc3 } = await invokeRoute('/api/academic/reports/rep_enr1_T1/validate', { reportId: 'rep_enr1_T1' }, {
    period: 'T1', enrollmentId: 'enr1', assessmentId: 'ass1', expectedRevision: 2
  });
  assert.strictEqual(sc3, 400, "Should reject validate with invalid assessment structural fields");

  setupDB();
  db.store.set('reports/rep_enr1_T1', { ...db.store.get('reports/rep_enr1_T1'), reportStatus: 'VALIDATED' });
  const { statusCode: sc4 } = await invokeRoute('/api/academic/reports/rep_enr1_T1', { reportId: 'rep_enr1_T1' }, {
    period: 'T1', enrollmentId: 'enr1', assessmentId: 'ass1', expectedRevision: 2, finalText: 'Changed'
  });
  assert.strictEqual(sc4, 400, "Should reject edits on validated report");

  console.log("All new rules passed.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
