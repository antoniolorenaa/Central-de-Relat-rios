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

    const res = await fetch('http://localhost:3000/api/academic/classes', {
      headers: { 'Authorization': `Bearer ${idToken}` }
    });
    
    if (res.status !== 200) {
      console.log("Error", res.status, await res.text());
      process.exit(1);
    }
    const data = await res.json();
    console.log("Success! Classes:", data.classes.length, "Brands:", data.meta.brands.length);
    if (data.classes.length > 0) {
      console.log("First class:", data.classes[0].displayName, "| Count:", data.classes[0].studentCount);
      console.log("Unit Name:", data.classes[0].unitName);
    }
    process.exit(0);
  } catch(e) {
    console.error("ERRO:", e.message);
    process.exit(1);
  }
}
run();
