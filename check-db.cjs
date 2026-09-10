const { initializeApp: initAdmin } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const adminApp = initAdmin({ projectId: 'gen-lang-client-0443933607' });
const db = getFirestore(adminApp, 'ai-studio-77b98651-eb46-4ef0-aac8-0ad5067fb9fd');

async function run() {
  const brands = await db.collection('brands').get();
  console.log("Brands count:", brands.size);
  const units = await db.collection('units').get();
  console.log("Units count:", units.size);
  process.exit(0);
}
run();
