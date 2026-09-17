const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/server*.ts');
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Replace generic 500 handler with one that checks for quota
  code = code.replace(/res\.status\(500\)\.json\(\{ error: e\.message \}\);/g, `
      if (e?.code === 8 || e?.message?.includes('RESOURCE_EXHAUSTED') || e?.message?.includes('Quota exceeded')) {
        return res.status(429).json({ error: "Limite de cota do banco de dados atingido. A cota diária gratuita do Firebase será restabelecida no próximo ciclo." });
      }
      res.status(500).json({ error: e.message });
  `);

  fs.writeFileSync(file, code);
}
console.log("Patched errors in backend files.");
