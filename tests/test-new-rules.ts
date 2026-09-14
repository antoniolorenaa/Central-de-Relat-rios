import assert from 'assert';
import { registerReportsRoutes } from '../src/server-reports';

// Mock Express
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

// Mock DB structure
class MockDB {
  store = new Map<string, any>();
  
  collection(path: string) {
    return {
      doc: (id?: string) => {
        const docId = id || 'random-id-' + Math.random();
        const fullPath = path + '/' + docId;
        return {
          id: docId,
          get: async () => ({
            exists: this.store.has(fullPath),
            data: () => this.store.get(fullPath),
            ref: { path: fullPath }
          }),
          set: async (data: any) => { this.store.set(fullPath, data); }
        };
      }
    };
  }
  
  async runTransaction(cb: any) {
    const transaction = {
      get: async (ref: any) => {
        const exists = this.store.has(ref.path);
        return { exists, data: () => this.store.get(ref.path) };
      },
      set: (ref: any, data: any) => {
        this.store.set(ref.path, data);
      }
    };
    return cb(transaction);
  }
}

const db = new MockDB();
const authenticate = (req: any, res: any, next: any) => next();

registerReportsRoutes(app as any, db as any, authenticate);

const invokeRoute = async (path: string, params: any, body: any) => {
  // Convert express path to regex equivalent for matching
  const route = app.routes.find(r => {
    const routeParts = r.path.split('/');
    const reqParts = path.split('/');
    if (routeParts.length !== reqParts.length) return false;
    return routeParts.every((p: string, i: number) => p.startsWith(':') || p === reqParts[i]);
  });
  
  if (!route) throw new Error("Route not found: " + path);
  
  const { req, res, getResult } = mockReqRes(body, params);
  
  for (const handler of route.handlers) {
    let nextCalled = false;
    await handler(req, res, () => { nextCalled = true; });
    if (!nextCalled) break;
  }
  
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
  
  // 1. Invalid expected revisions
  setupDB();
  for (const rev of [undefined, -1, 1.5, "2", null]) {
    const { statusCode } = await invokeRoute('/api/academic/reports/rep_enr1_T1', { reportId: 'rep_enr1_T1' }, {
      period: 'T1', enrollmentId: 'enr1', assessmentId: 'ass1', expectedRevision: rev
    });
    assert.strictEqual(statusCode, 400, "Should reject revision: " + rev);
  }
  
  // 2. Change link via normal save
  setupDB();
  const { statusCode: sc2 } = await invokeRoute('/api/academic/reports/rep_enr1_T1', { reportId: 'rep_enr1_T1' }, {
    period: 'T1', enrollmentId: 'enr1', assessmentId: 'other_ass', expectedRevision: 2
  });
  console.log(await invokeRoute("/api/academic/reports/rep_enr1_T1", { reportId: "rep_enr1_T1" }, {period: "T1", enrollmentId: "enr1", assessmentId: "other_ass", expectedRevision: 2}));

  // 3. Null structural fields
  setupDB();
  db.store.set('assessments/ass1', { ...db.store.get('assessments/ass1'), revision: -1 }); // Invalid revision
  const { statusCode: sc3 } = await invokeRoute('/api/academic/reports/rep_enr1_T1/validate', { reportId: 'rep_enr1_T1' }, {
    period: 'T1', enrollmentId: 'enr1', assessmentId: 'ass1', expectedRevision: 2
  });
  assert.strictEqual(sc3, 400, "Should reject validate with invalid assessment structural fields");

  // 4. Immutability after validate
  setupDB();
  db.store.set('reports/rep_enr1_T1', { ...db.store.get('reports/rep_enr1_T1'), reportStatus: 'VALIDATED' });
  const { statusCode: sc4 } = await invokeRoute('/api/academic/reports/rep_enr1_T1', { reportId: 'rep_enr1_T1' }, {
    period: 'T1', enrollmentId: 'enr1', assessmentId: 'ass1', expectedRevision: 2, finalText: 'Changed'
  });
  assert.strictEqual(sc4, 400, "Should reject edits on validated report");

  console.log("All new rules passed.");
}

run().catch(console.error);
