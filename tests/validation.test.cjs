const assert = require('assert');

function validateCriteria(criteria) {
  const codes = new Set();
  const objectives = new Set();
  
  for (const crit of criteria) {
    if (!crit.category) throw new Error(`Missing category: ${crit.code}`);
    if (!crit.objective) throw new Error(`Missing objective: ${crit.code}`);
    if (codes.has(crit.code)) throw new Error(`Duplicated code: ${crit.code}`);
    codes.add(crit.code);
    
    // We removed duplicate objective validation per user request
    objectives.add(crit.objective);
  }
  return true;
}

try {
  validateCriteria([
    { code: 'C1', category: 'A', objective: 'Obj 1' },
    { code: 'C2', category: 'A', objective: 'Obj 1' } // Duplicate objective is now allowed
  ]);
  
  try {
    validateCriteria([
      { code: 'C1', category: 'A', objective: 'Obj 1' },
      { code: 'C1', category: 'A', objective: 'Obj 2' } // Duplicate code
    ]);
    assert.fail('Should have thrown for duplicate code');
  } catch (e) {
    assert.strictEqual(e.message, 'Duplicated code: C1');
  }

  console.log('Validation tests passed');
} catch (e) {
  console.error(e);
  process.exit(1);
}
