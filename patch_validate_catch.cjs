const fs = require('fs');
let code = fs.readFileSync('src/server-reports.ts', 'utf8');

const regex = /res\.json\(\{ success: true, report: finalState \}\);\n    \} catch \(e: any\) \{[\s\S]*?res\.status\(500\)\.json\(\{ error: e\.message \}\);\n    \}\n  \}\);/m;

const replacement = `res.json({ success: true, report: finalState });
    } catch (e: any) {
      if (e.message === 'CONCURRENCY_CONFLICT') return res.status(409).json({ error: 'Este relatório foi atualizado por outro usuário. Recarregue para continuar.' });
      if (e.message === 'INVALID_ASSESSMENT_STATUS') return res.status(400).json({ error: 'Avaliação precisa estar COMPLETED.' });
      if (e.message === 'MISSING_FINAL_TEXT') return res.status(400).json({ error: 'Parecer não pode estar vazio.' });
      if (e.message === 'INVALID_TEXT_FIELD') return res.status(400).json({ error: 'Os campos textuais devem ser strings.' });
      if (e.message === 'O ID de avaliação diverge do vinculado ao relatório.') return res.status(400).json({ error: e.message });
      if (e.message === 'Vínculos inconsistentes entre avaliação, matrícula e relatório.') return res.status(400).json({ error: e.message });
      if (e.message === 'MATRIX_MISMATCH') return res.status(400).json({ error: 'A matriz do relatório diverge da avaliação.' });
      if (e.message === 'Revisão esperada não fornecida ou inválida.') return res.status(400).json({ error: e.message });
      if (e.message === 'Avaliação vinculada inexistente.') return res.status(404).json({ error: e.message });
      if (e.message === 'Relatório sem avaliação vinculada.') return res.status(400).json({ error: e.message });
      if (e.message === 'Relatório não encontrado.') return res.status(404).json({ error: e.message });
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/server-reports.ts', code);
  console.log("Patched catch block");
} else {
  console.log("Could not find catch block");
}
