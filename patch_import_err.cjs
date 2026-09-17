const fs = require('fs');
let code = fs.readFileSync('src/server-import.ts', 'utf8');

const newHandler = `
      if (e?.code === 8 || e?.message?.includes('RESOURCE_EXHAUSTED') || e?.message?.includes('Quota exceeded')) {
        return res.status(429).json({ error: "Limite de cota do banco de dados atingido. A cota diária gratuita do Firebase será restabelecida no próximo ciclo." });
      }
      res.status(500).json({ error: e.message });
`;

code = code.replace(/res\.status\(500\)\.json\(\{ error: 'Erro ao listar histórico' \}\);/g, newHandler);
code = code.replace(/res\.status\(500\)\.json\(\{ error: 'Erro no processamento do arquivo: ' \+ e\.message \}\);/g, newHandler);
code = code.replace(/res\.status\(500\)\.json\(\{ error: 'Erro na confirmação: ' \+ e\.message \}\);/g, newHandler);

fs.writeFileSync('src/server-import.ts', code);
