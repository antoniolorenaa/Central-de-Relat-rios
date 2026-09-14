const { execSync } = require('child_process');
try {
  execSync('npx tsx tests/test-consolidated.ts', { stdio: 'inherit' });
} catch (e) {
  console.log("TESTS FAILED");
}
