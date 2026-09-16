const fs = require('fs');
let code = fs.readFileSync('src/server-reports.ts', 'utf8');

const targetCatch = `} catch (e: any) {
      console.error('Gemini Error:', e);
      res.status(500).json({ error: e.message || 'Erro ao gerar sugestão com IA.' });
    }`;

const replaceCatch = `} catch (e: any) {
      console.error('Gemini Error:', e);
      if (e.message && (e.message.includes('RESOURCE_EXHAUSTED') || e.message.includes('Quota exceeded') || e.status === 429)) {
        return res.status(429).json({ error: 'Limite de uso da inteligência artificial atingido. Por favor, aguarde alguns instantes e tente novamente.' });
      }
      res.status(500).json({ error: e.message || 'Erro ao gerar sugestão com IA.' });
    }`;

if (code.includes(targetCatch)) {
  code = code.replace(targetCatch, replaceCatch);
  fs.writeFileSync('src/server-reports.ts', code);
  console.log("Fixed catch block.");
} else {
  console.log("Could not find the target catch block.");
}
