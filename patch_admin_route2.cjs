const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const fixRoute = `
  app.get('/api/fix-db', async (req, res) => {
    try {
      const snap = await db.collection('matrices').where('status', '==', 'DRAFT').get();
      if (snap.empty) return res.json({ error: "No draft found" });
      
      const doc = snap.docs[0];
      const data = [];
      const categoriesList = ['Linguagem', 'Matemática', 'Natureza', 'Sociedade', 'Artes'];
      let codeId = 1;
      for (let cat of categoriesList) {
        for (let i = 1; i <= 6; i++) {
          data.push({
            'Categoria ': cat,
            'Código': \`\${cat.substring(0,3).toUpperCase()}0\${i}\`,
            Objetivo: \`Objetivo \${i} de \${cat}\`,
            Ordem: codeId,
            'Obrigatório': 'Sim'
          });
          codeId++;
        }
      }
      data.push({ 'Categoria ': 'Linguagem', 'Código': 'LIN07', Objetivo: 'Objetivo 7 de Linguagem', Ordem: 31, 'Obrigatório': 'Sim' });
      data.push({ 'Categoria ': 'Artes', 'Código': 'ART07', Objetivo: 'Objetivo 7 de Artes', Ordem: 32, 'Obrigatório': 'Sim' });

      function normalizeKey(k) {
        return k.toLowerCase().trim().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
      }
      
      const criteria = [];
      const categories = new Set();
      
      data.forEach((row, idx) => {
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
          id: 'test-' + idx,
          code: codeValue,
          objective,
          category,
          order,
          required,
          active: true
        });
      });

      await doc.ref.update({
        categories: Array.from(categories),
        criteria: criteria.sort((a, b) => a.order - b.order),
        updatedAt: Date.now()
      });

      res.json({ success: true, updated: criteria.length, cats: categories.size });
    } catch (e) {
      res.json({ error: e.message });
    }
  });
`;
code = code.replace("app.use(express.json());", "app.use(express.json());\n" + fixRoute);
fs.writeFileSync('server.ts', code);
