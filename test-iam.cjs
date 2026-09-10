const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const app = initializeApp({ 
  projectId: 'gen-lang-client-0443933607', 
  credential: applicationDefault() 
});
const db = getFirestore(app, 'ai-studio-77b98651-eb46-4ef0-aac8-0ad5067fb9fd');

async function run() {
  try {
    console.log("1. Testando leitura simples...");
    const snap = await db.collection('brands').limit(1).get();
    console.log("Leitura OK. Tamanho:", snap.size);

    console.log("2. Testando escrita de registro temporário...");
    const tempRef = db.collection('_temp_test').doc('test1');
    await tempRef.set({ test: true, time: Date.now() });
    console.log("Escrita OK.");

    console.log("3. Lendo registro temporário...");
    const tempSnap = await tempRef.get();
    console.log("Leitura temp OK. Dado:", tempSnap.data().test);

    console.log("4. Removendo registro temporário...");
    await tempRef.delete();
    console.log("Remoção OK.");

  } catch (e) {
    console.error("ERRO NO TESTE FIRESTORE:", e.message);
  }
}
run();
