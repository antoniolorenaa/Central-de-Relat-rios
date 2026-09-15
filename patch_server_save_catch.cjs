const fs = require('fs');
let code = fs.readFileSync('src/server-reports.ts', 'utf8');

const oldCatch = `    } catch (e: any) {
      if (e.message === 'CONCURRENCY_CONFLICT') {
        return res.status(409).json({ error: 'Este relatório foi atualizado por outro usuário. Recarregue para continuar.' });
      }
      if (e.message === 'REPORT_VALIDATED') {
        return res.status(400).json({ error: 'Este relatório já foi validado e não pode ser editado.' });
      }
      console.error(e);
      res.status(500).json({ error: e.message });
    }`;

const newCatch = `    } catch (e: any) {
      if (e.message === 'CONCURRENCY_CONFLICT') {
        return res.status(409).json({ error: 'Este relatório foi atualizado por outro usuário. Recarregue para continuar.' });
      }
      if (e.message === 'REPORT_VALIDATED') {
        return res.status(400).json({ error: 'Este relatório já foi validado e não pode ser editado.' });
      }
      if (e.message === 'Vínculos inconsistentes no relatório.' || e.message === 'Revisão esperada não fornecida ou inválida.') {
        return res.status(400).json({ error: e.message });
      }
      console.error(e);
      res.status(500).json({ error: e.message });
    }`;

code = code.replace(oldCatch, newCatch);

fs.writeFileSync('src/server-reports.ts', code);
