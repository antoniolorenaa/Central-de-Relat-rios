const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

async function run() {
  console.log("Gerando arquivo CSV de carga com 600 alunos...");
  
  let csvContent = "Rede,Escola,Serie,Turma,Status,AnoLetivo,Turno,Aluno,Matricula,E-mail do Educacional do aluno,CPF,Responsavel\n";
  
  // Year 2026: 300 students
  for (let i = 1; i <= 300; i++) {
    const matricula = 10000 + i;
    csvContent += `Motivo,Boa Viagem,Infantil 4 Regular,A,Matriculado,2026,Manhã,Aluno Audit ${i},${matricula},aluno${i}@motivo.com.br,12345678901,Resp ${i}\n`;
  }
  
  // Year 2027: 300 students (150 same as 2026, 150 new)
  for (let i = 151; i <= 450; i++) {
    const matricula = 10000 + i;
    csvContent += `Motivo,Boa Viagem,Infantil 5 Regular,A,Matriculado,2027,Manhã,Aluno Audit ${i},${matricula},aluno${i}@motivo.com.br,12345678901,Resp ${i}\n`;
  }

  fs.writeFileSync('carga_audit.csv', csvContent);
  console.log("Arquivo gerado.");

  // To simulate the full API flow we need a custom token.
  const { initializeApp: initAdmin } = require('firebase-admin/app');
  const { getAuth: getAdminAuth } = require('firebase-admin/auth');
  const { initializeApp: initClient } = require('firebase/app');
  const { getAuth: getClientAuth, signInWithCustomToken } = require('firebase/auth');

  const adminApp = initAdmin({ projectId: 'gen-lang-client-0443933607' });
  const adminAuth = getAdminAuth(adminApp);
  
  // Client config
  const clientApp = initClient({
    projectId: "gen-lang-client-0443933607",
    appId: "1:537104394308:web:09c3e6ebc1793cb7177411",
    apiKey: "AIzaSyAY-pEDZk2CNhnfMnrebAWnx_7Gyc5Mdwk" // From firebase-config
  });
  const clientAuth = getClientAuth(clientApp);

  try {
    const token = await adminAuth.createCustomToken("antoniocarloslorena@gmail.com");
    const userCredential = await signInWithCustomToken(clientAuth, token);
    const idToken = await userCredential.user.getIdToken();

    console.log("1. Enviando arquivo para /api/admin/import/preview...");
    
    // Using native fetch with FormData requires node 18+ FormData.
    const fileData = new Blob([fs.readFileSync('carga_audit.csv')], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', fileData, 'carga_audit.csv');

    const resPreview = await fetch('http://localhost:3000/api/admin/import/preview', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${idToken}` },
      body: formData
    });
    const previewData = await resPreview.json();
    if (!resPreview.ok) throw new Error(previewData.error || 'Erro no preview');
    
    console.log(`Preview: ${previewData.batch.totalRows} lidos, ${previewData.batch.newStudents} novos alunos, ${previewData.batch.newEnrollments} novas matrículas.`);
    
    console.log("2. Confirmando importação...");
    const resConfirm = await fetch('http://localhost:3000/api/admin/import/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify({ batchId: previewData.batch.id })
    });
    
    const confirmData = await resConfirm.json();
    console.log("Confirmação: ", confirmData);

    const { getFirestore } = require('firebase-admin/firestore');
    const db = getFirestore(adminApp, 'ai-studio-77b98651-eb46-4ef0-aac8-0ad5067fb9fd');

    const stdCheck = await db.collection('students').where('nameNormalized', '==', 'aluno audit 200').get();
    console.log("Verificação Estudante 200 (deve haver 1):", stdCheck.size);
    
    const enrCheck = await db.collection('enrollments').where('studentId', '==', stdCheck.docs[0].id).get();
    console.log("Verificação Matrículas Estudante 200 (deve haver 2: 2026 e 2027):", enrCheck.size);

    const clsCheck = await db.collection('classes').get();
    let has2026 = false, has2027 = false;
    clsCheck.forEach(c => {
      if(c.data().schoolYear === '2026') has2026 = true;
      if(c.data().schoolYear === '2027') has2027 = true;
    });
    console.log("Classes separadas por ano?", has2026 && has2027);

    process.exit(0);
  } catch(e) {
    console.error("ERRO:", e.message);
    process.exit(1);
  }
}
run();
