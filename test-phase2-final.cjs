const fs = require('fs');

async function run() {
  console.log("Gerando arquivo CSV de carga com 600 alunos...");
  
  let csvContent = "Rede,Escola,Serie,Turma,Status,AnoLetivo,Turno,Aluno,Matricula,E-mail do Educacional do aluno,CPF,Responsavel\n";
  
  // Year 2026: 300 students
  for (let i = 1; i <= 300; i++) {
    const matricula = 10000 + i;
    // Add special characters to external ID for the test
    const finalMatricula = i === 10 ? `${matricula}-@#$%` : matricula;
    csvContent += `Motivo,Boa Viagem,Infantil 4 Regular,A,Matriculado,2026,Manhã,Aluno Audit ${i},${finalMatricula},aluno${i}@motivo.com.br,12345678901,Resp ${i}\n`;
  }
  
  // Year 2027: 300 students (150 same as 2026, 150 new)
  // For the longitudinal test: externalStudentId 10001
  for (let i = 151; i <= 450; i++) {
    const matricula = 10000 + i;
    csvContent += `Motivo,Boa Viagem,Infantil 5 Regular,A,Matriculado,2027,Manhã,Aluno Audit ${i},${matricula},aluno${i}@motivo.com.br,12345678901,Resp ${i}\n`;
  }
  
  // Ensure we add the explicit case requested:
  // 2026: MOTIVO, 10001, Infantil 5 (Wait, the prompt said 2026: Infantil 5, 2027: 1º Ano. Let's add it explicitly at the end)
  csvContent += `Motivo,Boa Viagem,Infantil 5 Regular,A,Matriculado,2026,Manhã,Aluno Teste Long 01,10001,alunolong@motivo.com.br,12345678901,Resp Long\n`;
  csvContent += `Motivo,Boa Viagem,1º Ano Regular,A,Matriculado,2027,Manhã,Aluno Teste Long 01,10001,alunolong@motivo.com.br,12345678901,Resp Long\n`;


  fs.writeFileSync('carga_audit_final.csv', csvContent);
  console.log("Arquivo gerado.");

  const { initializeApp: initAdmin } = require('firebase-admin/app');
  const { getAuth: getAdminAuth } = require('firebase-admin/auth');
  const { initializeApp: initClient } = require('firebase/app');
  const { getAuth: getClientAuth, signInWithCustomToken } = require('firebase/auth');
  const crypto = require('crypto');

  const adminApp = initAdmin({ projectId: 'gen-lang-client-0443933607' });
  const adminAuth = getAdminAuth(adminApp);
  
  const clientApp = initClient({
    projectId: "gen-lang-client-0443933607",
    appId: "1:537104394308:web:09c3e6ebc1793cb7177411",
    apiKey: "AIzaSyAY-pEDZk2CNhnfMnrebAWnx_7Gyc5Mdwk"
  });
  const clientAuth = getClientAuth(clientApp);

  try {
    const token = await adminAuth.createCustomToken("antoniocarloslorena@gmail.com");
    const userCredential = await signInWithCustomToken(clientAuth, token);
    const idToken = await userCredential.user.getIdToken();

    console.log("1. Enviando arquivo para preview...");
    
    const fileData = new Blob([fs.readFileSync('carga_audit_final.csv')], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', fileData, 'carga_audit_final.csv');

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

    // 1. Teste longitudinal (External ID 10001)
    const canonicalStudent = `MOTIVO|10001`;
    const studentHash = crypto.createHash('sha256').update(canonicalStudent).digest('hex');
    const stdId = `std_${studentHash}`;
    
    const stdCheck = await db.collection('students').doc(stdId).get();
    console.log("Teste Longitudinal - Aluno 10001 existe?", stdCheck.exists);
    
    const enrCheck = await db.collection('enrollments').where('studentId', '==', stdId).get();
    console.log("Teste Longitudinal - Qtde de matrículas do Aluno 10001 (Esperado 2):", enrCheck.size);

    // 2. Teste de ID Especial (External ID 10010-@#$%)
    const canonicalSpecial = `MOTIVO|10010-@#$%`;
    const specialHash = crypto.createHash('sha256').update(canonicalSpecial).digest('hex');
    const specialId = `std_${specialHash}`;
    const specialCheck = await db.collection('students').doc(specialId).get();
    console.log("Teste ID Especial - Documento válido e gravado?", specialCheck.exists);

    process.exit(0);
  } catch(e) {
    console.error("ERRO:", e.message);
    process.exit(1);
  }
}
run();
