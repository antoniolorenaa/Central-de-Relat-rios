const fs = require('fs');
let code = fs.readFileSync('src/server-matrices.ts', 'utf8');

const replacement = `
      function normalizeKey(k) {
        return k.toLowerCase().trim().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
      }

      rows.forEach((row, idx) => {
        const normalizedRow = {};
        for (const k of Object.keys(row)) {
          normalizedRow[normalizeKey(k)] = row[k];
        }

        const category = normalizedRow['categoria']?.toString().trim();
        const codeValue = normalizedRow['codigo']?.toString().trim();
        const objective = normalizedRow['objetivo']?.toString().trim();
        const orderRaw = normalizedRow['ordem']?.toString();
        const reqRaw = normalizedRow['obrigatorio']?.toString();
        
        if (!category || !codeValue || !objective) return;

        categories.add(category);
        
        let order = parseInt(orderRaw, 10);
        if (isNaN(order)) order = idx + 1;

        let required = true;
        if (reqRaw && (reqRaw.toLowerCase() === 'não' || reqRaw.toLowerCase() === 'nao' || reqRaw.toLowerCase() === 'false' || reqRaw === '0')) {
          required = false;
        }

        criteria.push({
          id: uuidv4(),
          code: codeValue,
          objective,
          category,
          order,
          required,
          active: true
        });
      });

      if (criteria.length === 0) {
        return res.status(400).json({ error: 'O arquivo não contém objetivos válidos. Verifique se os cabeçalhos são: Categoria, Código, Objetivo, Ordem, Obrigatório.' });
      }
`;

code = code.replace(/      rows\.forEach\(\(row, idx\) => \{[\s\S]*?      \}\);\n/g, replacement);

fs.writeFileSync('src/server-matrices.ts', code);
