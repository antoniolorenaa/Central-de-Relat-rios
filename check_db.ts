import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'ai-studio-77b98651-eb46-4ef0-aac8-0ad5067fb9fd' });
const db = getFirestore();

async function run() {
  const snap = await db.collection('matrices').where('status', '==', 'DRAFT').get();
  console.log(`Found ${snap.size} DRAFT matrices.`);
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`Matrix ID: ${doc.id}`);
    console.log(`  Grade: ${data.gradeLevelId}, Program: ${data.programId}, Period: ${data.period}`);
    console.log(`  Categories: ${data.categories?.length || 0}`);
    console.log(`  Criteria: ${data.criteria?.length || 0}`);
    if (data.criteria?.length > 0) {
      console.log(`  Sample Criterion:`, data.criteria[0]);
    }
  });
}
run().catch(console.error);
