const fs = require('fs');
let code = fs.readFileSync('src/server-import.ts', 'utf8');

code = code.replace(/res\.status\(500\)\.json\(\{ error: 'Erro no processamento\. Linha com formato inválido\.' \}\);/g, `
      if (e?.code === 8 || e?.message?.includes('RESOURCE_EXHAUSTED') || e?.message?.includes('Quota exceeded')) {
        return res.status(429).json({ error: "Limite de cota do banco de dados atingido." });
      }
      res.status(500).json({ error: 'Erro no processamento. Linha com formato inválido.' });
`);

code = code.replace(/res\.status\(500\)\.json\(\{ error: 'Erro ao buscar histórico: ' \+ e\.message \}\);/g, `
      if (e?.code === 8 || e?.message?.includes('RESOURCE_EXHAUSTED') || e?.message?.includes('Quota exceeded')) {
        return res.status(429).json({ error: "Limite de cota do banco de dados atingido." });
      }
      res.status(500).json({ error: 'Erro ao buscar histórico: ' + e.message });
`);

fs.writeFileSync('src/server-import.ts', code);
