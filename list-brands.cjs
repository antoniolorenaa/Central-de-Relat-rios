const { initializeApp: initAdmin } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const adminApp = initAdmin({ projectId: 'gen-lang-client-0443933607' });
const db = getFirestore(adminApp, 'ai-studio-77b98651-eb46-4ef0-aac8-0ad5067fb9fd');

async function run() {
  const brands = await db.collection('brands').get();
  brands.forEach(b => console.log(b.data().name, b.data().code));
  const units = await db.collection('units').get();
  units.forEach(u => console.log(u.data().name, u.data().code));
  process.exit(0);
}
run();
