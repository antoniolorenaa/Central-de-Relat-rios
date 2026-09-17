const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/server-*.ts');
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  
  // A generic replacement for console.error(e) when 'e' is used for the error object
  const target1 = /console\.error\(e\);/g;
  const new1 = `if (e?.code === 8 || e?.message?.includes('RESOURCE_EXHAUSTED') || e?.message?.includes('Quota exceeded')) {
        console.warn("Quota Warning:", e.message);
      } else {
        console.error(e);
      }`;
  code = code.replace(target1, new1);
  
  fs.writeFileSync(file, code);
}
console.log("Patched server files for quota logs.");
