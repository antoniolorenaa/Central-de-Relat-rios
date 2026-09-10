import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({
  projectId: 'ai-studio-77b98651-eb46-4ef0-aac8-0ad5067fb9fd'
});
const db = getFirestore();

async function check() {
  const assSnap = await db.collection('assessments').get();
  console.log('Assessments:', assSnap.size);
  assSnap.docs.slice(0, 5).forEach(d => console.log('ass:', d.id, d.data().matrixId, d.data().matrixVersion));
  
  const repSnap = await db.collection('reports').get();
  console.log('Reports:', repSnap.size);
  repSnap.docs.slice(0, 5).forEach(d => console.log('rep:', d.id));
}
check().catch(console.error);
