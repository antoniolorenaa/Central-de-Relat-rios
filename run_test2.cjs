const { execSync } = require('child_process');
try {
  execSync('npx tsx tests/test-new-rules.ts', { stdio: 'inherit' });
} catch (e) {
  console.log("FAILED");
}
