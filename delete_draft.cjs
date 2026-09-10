const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const app = admin.initializeApp({ projectId: 'ai-studio-77b98651-eb46-4ef0-aac8-0ad5067fb9fd' });
const db = getFirestore(app);

async function run() {
  const snap = await db.collection('matrices').where('status', '==', 'DRAFT').get();
  for (const doc of snap.docs) {
    await doc.ref.delete();
    console.log("Deleted", doc.id);
  }
}
run().catch(console.error);
