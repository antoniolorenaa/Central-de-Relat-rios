const crypto = require('crypto');
function generateDeterministicId(prefix, parts) {
  const canonical = parts.join('|');
  const hash = crypto.createHash('sha256').update(canonical).digest('hex');
  return `${prefix}_${hash}`;
}

const stdId = generateDeterministicId('std', ['MOTIVO', '10001']);
console.log("Student ID:", stdId);

const enrId2026 = generateDeterministicId('enr', ['MOTIVO', '10001', '2026']);
console.log("Enrollment 2026:", enrId2026);

const enrId2027 = generateDeterministicId('enr', ['MOTIVO', '10001', '2027']);
console.log("Enrollment 2027:", enrId2027);

const classId2026 = generateDeterministicId('cls', ['brandId', 'unitId', '2026', 'glId', 'progId', 'MORNING', 'infantil4am']);
console.log("Class 2026:", classId2026);

const classId2027 = generateDeterministicId('cls', ['brandId', 'unitId', '2027', 'glId', 'progId', 'MORNING', 'infantil4am']);
console.log("Class 2027:", classId2027);
