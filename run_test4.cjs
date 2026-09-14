const { execSync } = require('child_process');
try {
  execSync('sed -i "s/throw new Error(\'CONCURRENCY_CONFLICT\');/throw new Error(\'CONCURRENCY_CONFLICT: \' + reportData.revision + \' != \' + expectedRevision);/" src/server-reports.ts && npx tsx tests/test-new-rules.ts', { stdio: 'inherit' });
} catch (e) {
  console.log("FAILED");
}
