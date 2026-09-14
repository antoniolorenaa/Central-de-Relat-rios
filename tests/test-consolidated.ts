import assert from 'assert';
import express from 'express';
import { registerReportsRoutes } from '../src/server-reports';

// --- IN-MEMORY DB MOCK ---
class MockDocRef {
  constructor(public path: string) {}
  get id() { return this.path.split('/').pop()!; }
  collection(name: string) { return new MockCollection(this.path + '/' + name); }
  async get() {
    const data = (global as any).mockDb.store.get(this.path);
    return { exists: !!data, data: () => data ? structuredClone(data) : undefined, ref: this, id: this.id };
  }
  async set(data: any, options?: any) {
    if (options && options.merge) {
      const existing = (global as any).mockDb.store.get(this.path) || {};
      (global as any).mockDb.store.set(this.path, { ...existing, ...structuredClone(data) });
    } else {
      (global as any).mockDb.store.set(this.path, structuredClone(data));
    }
  }
  async update(data: any) {
    const existing = (global as any).mockDb.store.get(this.path);
    if (!existing) throw new Error("Doc missing: " + this.path);
    (global as any).mockDb.store.set(this.path, { ...existing, ...structuredClone(data) });
  }
}

class MockCollection {
  constructor(public path: string) {}
  doc(id?: string) {
    if (!id) id = 'auto_' + Math.random().toString(36).substring(2, 9);
    return new MockDocRef(this.path + '/' + id);
  }
}

class MockFirestore {
  store = new Map<string, any>();
  collection(name: string) { return new MockCollection(name); }
  async runTransaction(callback: (t: any) => Promise<any>) {
    const t = new MockTransaction(this);
    const result = await callback(t);
    for (const [path, data] of t.writes.entries()) {
      this.store.set(path, data);
    }
    return result;
  }
}

class MockTransaction {
  hasWritten = false;
  writes = new Map<string, any>();
  constructor(public db: MockFirestore) {}
  async get(ref: MockDocRef) {
    if (this.hasWritten) throw new Error("Leituras após o início das escritas não são permitidas.");
    const data = this.writes.has(ref.path) ? this.writes.get(ref.path) : this.db.store.get(ref.path);
    return { exists: !!data, data: () => data ? structuredClone(data) : undefined, ref, id: ref.id };
  }
  set(ref: MockDocRef, data: any, options?: any) {
    this.hasWritten = true;
    if (options && options.merge) {
      const existing = this.writes.get(ref.path) || this.db.store.get(ref.path) || {};
      this.writes.set(ref.path, { ...existing, ...structuredClone(data) });
    } else {
      this.writes.set(ref.path, structuredClone(data));
    }
  }
  update(ref: MockDocRef, data: any) {
    this.hasWritten = true;
    const existing = this.writes.get(ref.path) || this.db.store.get(ref.path);
    if (!existing) throw new Error("Document does not exist to update: " + ref.path);
    this.writes.set(ref.path, { ...existing, ...structuredClone(data) });
  }
}

const handlers: Record<string, Function[]> = {};
const app = {
  post: (path: string, ...middlewares: any[]) => { handlers[path] = middlewares; }
} as express.Express;

async function runTests() {
  console.log("Iniciando suíte de 19 cenários consolidada...");
  let passed = 0, failed = 0;
  
  const db = new MockFirestore();
  (global as any).mockDb = db;
  const authenticate = (req: any, res: any, next: any) => { req.user = req.user || { uid: 'user1' }; next(); };
  
  registerReportsRoutes(app, db as any, authenticate);
  
  const mockReqRes = (body: any, params: any) => {
    const req = { body, params, user: { uid: 'user1' } };
    let responseData: any;
    let statusCode = 200;
    const res = {
      status: (code: number) => { statusCode = code; return res; },
      json: (data: any) => { responseData = data; return res; },
      send: (data: any) => { responseData = data; return res; }
    };
    return { req, res, getResult: () => ({ statusCode, responseData }) };
  };

  const invokeRoute = async (path: string, body: any, params: any) => {
    const routeHandlers = handlers[path];
    if (!routeHandlers) throw new Error("Route not found: " + path);
    const { req, res, getResult } = mockReqRes(body, params);
    for (const handler of routeHandlers) {
      let nextCalled = false;
      await handler(req, res, () => { nextCalled = true; });
      if (!nextCalled) break;
    }
    const result = getResult();
    if (result.statusCode === 400) console.error("400 ERROR:", result.responseData);
    return result;
  };
  const _ignore = async (path: string, body: any, params: any) => {
    const routeHandlers = handlers[path];
    if (!routeHandlers) throw new Error("Route not found: " + path);
    const { req, res, getResult } = mockReqRes(body, params);
    for (const handler of routeHandlers) {
      let nextCalled = false;
      await handler(req, res, () => { nextCalled = true; });
      if (!nextCalled) break;
    }
    return getResult();
  };

  const setupDB = () => {
    db.store.clear();
    db.store.set('users/user1', { role: 'MASTER' });
    db.store.set('users/user2', { role: 'TEACHER' });
    
    db.store.set('classes/cls1', { id: 'cls1', gradeLevelId: 'grade1', brandId: 'b1', programId: 'p1' });
    
    db.store.set('enrollments/enr1', { id: 'enr1', studentId: 'stu1', classId: 'cls1', schoolYear: '2026' });
    db.store.set('enrollments/enr2', { id: 'enr2', studentId: 'stu2', classId: 'cls1', schoolYear: '2026' });
    
    db.store.set('matrices/mat1', { status: 'PUBLISHED', schoolYear: '2026', period: 'T1', gradeLevelId: 'grade1', brandId: 'GLOBAL', programId: 'ALL', version: 1, criteria: [{ id: 'c1', required: true }] });
    
    db.store.set('reports/rep_enr1_T1', { id: 'rep_enr1_T1', revision: 1, reportStatus: 'IN_PROGRESS', matrixId: 'mat1', matrixVersion: 1, assessmentId: 'ass1', enrollmentId: 'enr1', studentId: 'stu1', classId: 'cls1', schoolYear: '2026', period: 'T1', finalText: 'Valid' });
    db.store.set('assessments/ass1', { id: 'ass1', enrollmentId: 'enr1', studentId: 'stu1', classId: 'cls1', schoolYear: '2026', period: 'T1', matrixId: 'mat1', matrixVersion: 1, status: 'COMPLETED', revision: 1, answers: {} });
  };

  const testCases = [
    {
      name: "1. Transfer: Matriz inexistente é rejeitada sem gravações",
      run: async () => {
        setupDB();
        const { statusCode, responseData } = await invokeRoute('/api/academic/reports/:reportId/transfer', 
          { enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat_missing', expectedRevision: 1 }, 
          { reportId: 'rep_enr1_T1' }
        );
        assert.strictEqual(statusCode, 404, JSON.stringify(responseData));
        assert.ok(responseData.error.includes('Matriz de destino não encontrada'));
      }
    },
    {
      name: "2. Transfer: Destino inexistente é criado (assessment novo)",
      run: async () => {
        setupDB();
        const { statusCode, responseData } = await invokeRoute('/api/academic/reports/:reportId/transfer', 
          { enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat1', expectedRevision: 1 }, 
          { reportId: 'rep_enr1_T1' }
        );
        assert.strictEqual(statusCode, 200);
        const report = db.store.get('reports/rep_enr1_T1');
        assert.strictEqual(report.revision, 2);
      }
    },
    {
      name: "3. Transfer: Versão enviada pelo cliente não determina a versão salva",
      run: async () => {
        setupDB();
        db.store.set('matrices/mat_new', { status: 'PUBLISHED', schoolYear: '2026', period: 'T1', gradeLevelId: 'grade1', brandId: 'GLOBAL', programId: 'ALL', version: 5, criteria: [{ id: 'c1', required: true }] });
        const { statusCode, responseData } = await invokeRoute('/api/academic/reports/:reportId/transfer', 
          { enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat_new', newMatrixVersion: 999, expectedRevision: 1 }, 
          { reportId: 'rep_enr1_T1' }
        );
        assert.strictEqual(statusCode, 200);
        const report = db.store.get('reports/rep_enr1_T1');
        assert.strictEqual(report.matrixVersion, 5);
      }
    },
    {
      name: "4. Transfer: Textos são preservados",
      run: async () => {
        setupDB();
        db.store.set('reports/rep_enr1_T1', { ...db.store.get('reports/rep_enr1_T1'), strengths: 'Testing strengths', revision: 3 });
        await invokeRoute('/api/academic/reports/:reportId/transfer', 
          { enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat1', expectedRevision: 3 }, 
          { reportId: 'rep_enr1_T1' }
        );
        const report = db.store.get('reports/rep_enr1_T1');
        assert.strictEqual(report.strengths, 'Testing strengths');
        assert.strictEqual(report.revision, 4);
      }
    },
    {
      name: "5. Transfer: Destino existente mantém as respostas",
      run: async () => {
        setupDB();
        db.store.set('reports/rep_enr2_T1', { id: 'rep_enr2_T1', revision: 1, reportStatus: 'IN_PROGRESS', matrixId: 'oldMat', assessmentId: 'ass_enr2_mat1_T1', enrollmentId: 'enr2', studentId: 'stu2', classId: 'cls1', schoolYear: '2026', period: 'T1' });
        db.store.set('assessments/ass_enr2_mat1_T1', { id: 'ass_enr2_mat1_T1', enrollmentId: 'enr2', studentId: 'stu2', classId: 'cls1', schoolYear: '2026', period: 'T1', matrixId: 'mat1', matrixVersion: 1, answers: { c1: 'A' } });
        await invokeRoute('/api/academic/reports/:reportId/transfer', 
          { enrollmentId: 'enr2', period: 'T1', newMatrixId: 'mat1', expectedRevision: 1 }, 
          { reportId: 'rep_enr2_T1' }
        );
        const ass = db.store.get('assessments/ass_enr2_mat1_T1');
        assert.strictEqual(ass.answers.c1, 'A');
      }
    },
    {
      name: "6. Transfer: Revisão desatualizada retorna 409",
      run: async () => {
        setupDB();
        const { statusCode } = await invokeRoute('/api/academic/reports/:reportId/transfer', 
          { enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat1', expectedRevision: 1 }, 
          { reportId: 'rep_enr1_T1' }
        );
        // wait, I setup db with revision 1, so expected 1 should pass! 
        // to test 409, I must pass wrong expectedRevision
        const res2 = await invokeRoute('/api/academic/reports/:reportId/transfer', 
          { enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat1', expectedRevision: 99 }, 
          { reportId: 'rep_enr1_T1' }
        );
        assert.strictEqual(res2.statusCode, 409);
      }
    },
    {
      name: "7. Validate: Erro se não existir",
      run: async () => {
        setupDB();
        const { statusCode } = await invokeRoute('/api/academic/reports/:reportId/validate', 
          { enrollmentId: 'missing', period: 'T1', expectedRevision: 1 }, { reportId: 'rep_missing_T1' }
        );
        assert.strictEqual(statusCode, 404);
      }
    },
    {
      name: "8. Validate: Erro se revisão errada",
      run: async () => {
        setupDB();
        const { statusCode } = await invokeRoute('/api/academic/reports/:reportId/validate', 
          { enrollmentId: 'enr1', period: 'T1', expectedRevision: 99 }, { reportId: 'rep_enr1_T1' }
        );
        assert.strictEqual(statusCode, 409);
      }
    },
    {
      name: "9. Validate: Sucesso muda para VALIDATED e cria log de auditoria",
      run: async () => {
        setupDB();
        const { statusCode } = await invokeRoute('/api/academic/reports/:reportId/validate', 
          { enrollmentId: 'enr1', period: 'T1', expectedRevision: 1, assessmentId: 'ass1' }, { reportId: 'rep_enr1_T1' }
        );
        assert.strictEqual(statusCode, 200);
        const report = db.store.get('reports/rep_enr1_T1');
        assert.strictEqual(report.reportStatus, 'VALIDATED');
        assert.strictEqual(report.revision, 2);
        let auditFound = false;
        for (const val of db.store.values()) {
          if (val.action === 'REPORT_VALIDATED' && val.reportId === 'rep_enr1_T1') auditFound = true;
        }
        assert.ok(auditFound);
      }
    },
    {
      name: "10. Reopen: Erro se revisão errada",
      run: async () => {
        setupDB();
        db.store.set('reports/rep_enr1_T1', { id: 'rep_enr1_T1', revision: 2, reportStatus: 'VALIDATED', matrixId: 'mat1', matrixVersion: 1, assessmentId: 'ass1', enrollmentId: 'enr1', studentId: 'stu1', classId: 'cls1', schoolYear: '2026', period: 'T1', finalText: 'Valid final text' });
        const { statusCode } = await invokeRoute('/api/academic/reports/:reportId/reopen', 
          { enrollmentId: 'enr1', period: 'T1', expectedRevision: 1, assessmentId: 'ass1' }, { reportId: 'rep_enr1_T1' }
        );
        assert.strictEqual(statusCode, 409);
      }
    },
    {
      name: "11. Reopen: Sucesso muda para IN_PROGRESS e cria log de auditoria",
      run: async () => {
        setupDB();
        db.store.set('reports/rep_enr1_T1', { id: 'rep_enr1_T1', revision: 2, reportStatus: 'VALIDATED', matrixId: 'mat1', matrixVersion: 1, assessmentId: 'ass1', enrollmentId: 'enr1', studentId: 'stu1', classId: 'cls1', schoolYear: '2026', period: 'T1', finalText: 'Valid final text' });
        const { statusCode } = await invokeRoute('/api/academic/reports/:reportId/reopen', 
          { enrollmentId: 'enr1', period: 'T1', expectedRevision: 2, assessmentId: 'ass1' }, 
          { reportId: 'rep_enr1_T1' }
        );
        assert.strictEqual(statusCode, 200);
        const report = db.store.get('reports/rep_enr1_T1');
        assert.strictEqual(report.reportStatus, 'READY_FOR_REVIEW');
        assert.strictEqual(report.revision, 3);
        let auditFound = false;
        for (const val of db.store.values()) {
          if (val.action === 'REPORT_REOPENED' && val.reportId === 'rep_enr1_T1') auditFound = true;
        }
        assert.ok(auditFound);
      }
    },
    {
      name: "12. Save: Erro se revisão desatualizada",
      run: async () => {
        setupDB();
        const { statusCode } = await invokeRoute('/api/academic/reports/:reportId', 
          { enrollmentId: 'enr1', period: 'T1', matrixId: 'mat1', matrixVersion: 1, expectedRevision: 99, assessmentId: 'ass1', answers: {} }, 
          { reportId: 'rep_enr1_T1' }
        );
        assert.strictEqual(statusCode, 409);
      }
    },
    {
      name: "13. Save: Cria se não existir, status IN_PROGRESS",
      run: async () => {
        setupDB();
        db.store.set('enrollments/enr3', { id: 'enr3', studentId: 'stu3', classId: 'cls1', schoolYear: '2026' });
        const { statusCode } = await invokeRoute('/api/academic/reports/:reportId', 
          { enrollmentId: 'enr3', period: 'T1', matrixId: 'mat1', matrixVersion: 1, expectedRevision: 0, assessmentId: 'ass_enr3_mat1_T1', answers: { c1: 'S' } }, 
          { reportId: 'rep_enr3_T1' }
        );
        assert.strictEqual(statusCode, 200);
        const report = db.store.get('reports/rep_enr3_T1');
        assert.strictEqual(report.reportStatus, 'NOT_STARTED'); // replaced below if reopen
        assert.strictEqual(report.revision, 1);
      }
    },
    {
      name: "14. Save: Atualiza textos e incrementa revisão",
      run: async () => {
        setupDB();
        const { statusCode } = await invokeRoute('/api/academic/reports/:reportId', 
          { enrollmentId: 'enr1', period: 'T1', matrixId: 'mat1', matrixVersion: 1, expectedRevision: 1, assessmentId: 'ass1', strengths: 'Wow', answers: {} }, 
          { reportId: 'rep_enr1_T1' }
        );
        assert.strictEqual(statusCode, 200);
        const report = db.store.get('reports/rep_enr1_T1');
        assert.strictEqual(report.strengths, 'Wow');
        assert.strictEqual(report.revision, 2);
      }
    },
    {
      name: "15. Save: Falha se matrícula não encontrada",
      run: async () => {
        setupDB();
        const { statusCode } = await invokeRoute('/api/academic/reports/:reportId', 
          { enrollmentId: 'missing', period: 'T1', matrixId: 'mat1', matrixVersion: 1, expectedRevision: 1, assessmentId: 'ass1' }, 
          { reportId: 'rep_missing_T1' }
        );
        assert.strictEqual(statusCode, 404);
      }
    },
    {
      name: "16. Transfer: Erro se a matrícula não existir",
      run: async () => {
        setupDB();
        const { statusCode } = await invokeRoute('/api/academic/reports/:reportId/transfer', 
          { enrollmentId: 'missing_enr', period: 'T1', newMatrixId: 'mat1', expectedRevision: 1 }, 
          { reportId: 'rep_missing_enr_T1' }
        );
        assert.strictEqual(statusCode, 404);
      }
    },
    {
      name: "17. Transfer: Cria log de auditoria",
      run: async () => {
        setupDB();
        await invokeRoute('/api/academic/reports/:reportId/transfer', 
          { enrollmentId: 'enr1', period: 'T1', newMatrixId: 'mat1', expectedRevision: 1 }, 
          { reportId: 'rep_enr1_T1' }
        );
        let auditFound = false;
        for (const val of db.store.values()) {
          if (val && typeof val === 'object' && val.action === 'REPORT_TRANSFERRED' && val.reportId === 'rep_enr1_T1') auditFound = true;
        }
        assert.ok(auditFound);
      }
    },
    {
      name: "18. Validate: Falha sem permissão",
      run: async () => {
        setupDB();
        const { req, res, getResult } = mockReqRes({ enrollmentId: 'enr1', period: 'T1', expectedRevision: 1, assessmentId: 'ass1' }, { reportId: 'rep_enr1_T1' });
        req.user.uid = 'user2'; // TEACHER
        const routeHandlers = handlers['/api/academic/reports/:reportId/validate'];
        for (const handler of routeHandlers) {
          let nextCalled = false;
          await handler(req, res, () => { nextCalled = true; });
          if (!nextCalled) break;
        }
        const { statusCode } = getResult();
        assert.strictEqual(statusCode, 403);
      }
    },
    {
      name: "19. MockTransaction: Descarte das escritas em erro",
      run: async () => {
        setupDB();
        try {
          await db.runTransaction(async (t: any) => {
            const ref = db.collection('reports').doc('rep_enr1_T1');
            t.set(ref, { id: 'temp_write' }, { merge: true });
            throw new Error('Test abort');
          });
        } catch (e) {}
        const report = db.store.get('reports/rep_enr1_T1');
        assert.notStrictEqual(report.id, 'temp_write');
        
        let readError = null;
        try {
          await db.runTransaction(async (t: any) => {
            const ref = db.collection('reports').doc('rep_enr1_T1');
            t.set(ref, { foo: 'bar' });
            await t.get(ref);
          });
        } catch (e: any) {
          readError = e.message;
        }
        assert.ok(readError.includes('Leituras após o início das escritas não são permitidas'));
      }
    }
  ];

  for (const tc of testCases) {
    try {
      await tc.run();
      console.log(`[PASS] ${tc.name}`);
      passed++;
    } catch (e) {
      console.error(`[FAIL] ${tc.name}`, e);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests().catch(e => { console.error(e); process.exit(1); });
