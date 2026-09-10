const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
const testRoute = `
  app.get('/api/test-db', async (req, res) => {
    try {
      const snap = await db.collection('matrices').get();
      res.json(snap.docs.map(d => d.data()));
    } catch (e) {
      res.json({ error: e.message });
    }
  });
`;
code = code.replace("app.use(express.json());", "app.use(express.json());\n" + testRoute);
fs.writeFileSync('server.ts', code);
