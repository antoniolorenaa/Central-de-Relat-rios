const assert = require('assert');

// Simple mock for Firestore Transaction
class MockTransaction {
  constructor() {
    this.store = new Map();
    this.reads = new Set();
  }
  async get(ref) {
    this.reads.add(ref.path);
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

async function runTests() {
  const t = new MockTransaction();
  
  const enrollment = { schoolYear: '2026', studentId: 'stu1', classId: 'cls1' };
  const period = 'T1';
  
  // Test 1
  t.store.set('reports/rep_enr1_T1', { 
    id: 'rep_enr1_T1', revision: 1, reportStatus: 'IN_PROGRESS', assessmentId: 'ass_old', 
    strengths: 'Forças antigas', developmentAspects: 'Aspectos', additionalInformation: 'Info', finalText: 'Final',
    matrixId: 'oldMat' 
  });
  
  let errorMsg = null;
  try {
    const reportRef = { path: 'reports/rep_enr1_T1' };
    const matrixRef = { path: 'matrices/mat_missing' };
    const doc = await t.get(reportRef);
    const reportData = doc.data();
    if (reportData.revision !== 1) throw new Error('CONCURRENCY_CONFLICT');
    const matrixDoc = await t.get(matrixRef);
    if (!matrixDoc.exists) throw new Error('Matriz de destino não encontrada.');
  } catch(e) {
    errorMsg = e.message;
  }
  assert.strictEqual(errorMsg, 'Matriz de destino não encontrada.');
  
  console.log('Transfer tests passed');
}

runTests().catch(console.error);
