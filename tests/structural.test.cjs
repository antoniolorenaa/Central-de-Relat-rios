const assert = require('assert');

function parseData(row) {
  function normalizeKey(k) {
    return k.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  
  const normalizedRow = {};
  for (const k of Object.keys(row)) {
    normalizedRow[normalizeKey(k)] = row[k];
  }
  
  const category = normalizedRow['categoria']?.toString().trim();
  const codeValue = normalizedRow['codigo']?.toString().trim();
  const objective = normalizedRow['objetivo']?.toString().trim();
  
  if (!category || !codeValue || !objective) {
    throw new Error('Faltam campos obrigatórios');
  }
  
  return { category, codeValue, objective };
}

try {
  const result = parseData({ 'Categoria': 'A', ' Código ': 'C1', 'Objetivo ': 'O1' });
  assert.strictEqual(result.category, 'A');
  assert.strictEqual(result.codeValue, 'C1');
  assert.strictEqual(result.objective, 'O1');
  
  console.log('Structural parser tests passed');
} catch (e) {
  console.error(e);
  process.exit(1);
}
