import assert from 'assert';
import { registerMatricesRoutes } from '../src/server-matrices';

const app = {
  routes: [] as any[],
  delete: function(path: string, ...handlers: any[]) {
    this.routes.push({ method: 'delete', path, handlers });
  },
  post: function(path: string, ...handlers: any[]) {
    this.routes.push({ method: 'post', path, handlers });
  },
  get: function(path: string, ...handlers: any[]) {
    this.routes.push({ method: 'get', path, handlers });
  }
};

const mockReqRes = (params: any, uid: string, role: string) => {
  const req = { params, user: { uid, role } };
  let statusCode = 200;
  let responseData: any = null;
  const res = {
    status: (code: number) => { statusCode = code; return res; },
    json: (data: any) => { responseData = data; return res; },
    send: (data: any) => { responseData = data; return res; }
  };
  return { req, res, getResult: () => ({ statusCode, responseData }) };
};

const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

const db = {
  store: new Map<string, any>(),
  collection: (name: string) => ({
    doc: (id?: string) => {
      const docId = id || 'new_id';
      const path = `${name}/${docId}`;
      return {
        id: docId,
        get: async () => ({
          exists: db.store.has(path),
          data: () => clone(db.store.get(path))
        })
      };
    },
    where: (field: string, op: string, value: any) => ({
      limit: (n: number) => ({
        get: async () => {
          const results = Array.from(db.store.entries())
            .filter(([k, v]) => k.startsWith(name + '/') && v[field] === value);
          return { empty: results.length === 0 };
        }
      })
    })
  }),
  runTransaction: async (callback: any) => {
    const t = {
      get: async (ref: any) => ref.get(),
      set: (ref: any, data: any) => { db.store.set(`${ref.path || 'auditLogs/' + ref.id}`, clone(data)); },
      delete: (ref: any) => { db.store.delete(`${ref.path || 'matrices/' + ref.id}`); }
    };
    await callback(t);
  }
};

// Middlewares
const authenticate = (req: any, res: any, next: any) => {
  if (!req.user) return res.status(401).json({ error: 'Unauth' });
  next();
};
const requireMaster = (req: any, res: any, next: any) => {
  if (req.user.role !== 'MASTER') return res.status(403).json({ error: 'Forbidden' });
  next();
};

registerMatricesRoutes(app as any, db as any, authenticate, requireMaster);

const invokeRoute = async (method: string, path: string, params: any, uid = 'master1', role = 'MASTER') => {
  const route = app.routes.find(r => r.method === method && r.path === path);
  if (!route) throw new Error(`Route not found: ${method} ${path}`);
  const { req, res, getResult } = mockReqRes(params, uid, role);
  for (const handler of route.handlers) {
    let nextCalled = false;
    await handler(req, res, () => { nextCalled = true; });
    if (!nextCalled) break; // response sent
  }
  return getResult();
};

let passed = 0;
let failed = 0;

const runTest = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (e: any) {
    console.error(`[FAIL] ${name}\n       ${e.message}`);
    failed++;
  }
};

async function runTests() {
  console.log("Iniciando testes de exclusão de matrizes...");

  // Reset store
  const resetStore = () => {
    db.store.clear();
    db.store.set('matrices/m_draft', { status: 'DRAFT', name: 'Draft' });
    db.store.set('matrices/m_pub', { status: 'PUBLISHED', name: 'Pub' });
    db.store.set('matrices/m_linked', { status: 'DRAFT', name: 'Linked' });
    db.store.set('assessments/a1', { matrixId: 'm_linked' });
  };

  await runTest("1. Sucesso: Exclui rascunho sem vínculos", async () => {
    resetStore();
    const res = await invokeRoute('delete', '/api/admin/matrices/:id', { id: 'm_draft' });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(db.store.has('matrices/m_draft'), false);
    
    // Check audit log
    const auditLogs = Array.from(db.store.entries()).filter(([k]) => k.startsWith('auditLogs/'));
    assert.strictEqual(auditLogs.length, 1);
    assert.strictEqual(auditLogs[0][1].action, 'MATRIX_DELETED');
  });

  await runTest("2. Falha: Tenta excluir matriz publicada (400)", async () => {
    resetStore();
    const res = await invokeRoute('delete', '/api/admin/matrices/:id', { id: 'm_pub' });
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(db.store.has('matrices/m_pub'), true);
  });

  await runTest("3. Falha: Tenta excluir matriz com vínculos (400)", async () => {
    resetStore();
    const res = await invokeRoute('delete', '/api/admin/matrices/:id', { id: 'm_linked' });
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(db.store.has('matrices/m_linked'), true);
  });

  await runTest("4. Falha: Usuário sem permissão MASTER (403)", async () => {
    resetStore();
    const res = await invokeRoute('delete', '/api/admin/matrices/:id', { id: 'm_draft' }, 'user1', 'MANAGER');
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(db.store.has('matrices/m_draft'), true);
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
