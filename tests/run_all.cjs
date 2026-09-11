const { execSync } = require('child_process');
const fs = require('fs');

const testFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.cjs'));

let passed = 0;
let failed = 0;

for (const file of testFiles) {
  console.log(`Running ${file}...`);
  try {
    execSync(`node ${__dirname}/${file}`, { stdio: 'inherit' });
    passed++;
  } catch (e) {
    failed++;
  }
}

console.log(`\nTest Summary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
