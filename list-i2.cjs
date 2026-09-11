const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./firebase-applet-config.json');

const app = initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore(app);

async function main() {
  const snaps = await db.collection('matrices').get();
  snaps.forEach(doc => {
    const data = doc.data();
    if (data.gradeLevelId === 'gl_i2') {
      console.log(doc.id, data.status, data.version, data.gradeLevelId, data.brandId);
    }
  });
}
main().catch(console.error);
