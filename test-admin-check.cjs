const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const app = initializeApp({ projectId: 'gen-lang-client-0443933607', credential: applicationDefault() });

async function run() {
  try {
    const dbNamed = getFirestore(app, 'ai-studio-77b98651-eb46-4ef0-aac8-0ad5067fb9fd');
    const snap = await dbNamed.collection('brands').limit(1).get();
    console.log('Named DB Success:', snap.size);
  } catch (e) {
    console.error('Named DB Error:', e.message);
  }
}
run();
