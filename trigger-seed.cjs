const { initializeApp: initAdmin } = require('firebase-admin/app');
const { getAuth: getAdminAuth } = require('firebase-admin/auth');
const { initializeApp: initClient } = require('firebase/app');
const { getAuth: getClientAuth, signInWithCustomToken } = require('firebase/auth');

const adminApp = initAdmin({ projectId: 'gen-lang-client-0443933607' });
const adminAuth = getAdminAuth(adminApp);

const clientApp = initClient({
  projectId: "gen-lang-client-0443933607",
  appId: "1:537104394308:web:09c3e6ebc1793cb7177411",
  apiKey: "AIzaSyAY-pEDZk2CNhnfMnrebAWnx_7Gyc5Mdwk"
});
const clientAuth = getClientAuth(clientApp);

async function run() {
  try {
    const token = await adminAuth.createCustomToken("antoniocarloslorena@gmail.com");
    const userCredential = await signInWithCustomToken(clientAuth, token);
    const idToken = await userCredential.user.getIdToken();

    console.log("Chamando /api/admin/seed...");
    const resSeed = await fetch('http://localhost:3000/api/admin/seed', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${idToken}` }
    });
    console.log("Seed Response:", await resSeed.json());

    console.log("Chamando /api/admin/stats...");
    const resStats = await fetch('http://localhost:3000/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${idToken}` }
    });
    console.log("Stats Response:", await resStats.json());

    process.exit(0);
  } catch (e) {
    console.error("ERRO:", e.message);
    process.exit(1);
  }
}
run();
