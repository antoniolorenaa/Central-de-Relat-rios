import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

let app;
try {
  app = initializeApp();
} catch (e) {
  // Already initialized or fallback
}
const db = getFirestore();

async function check() {
  const assSnap = await db.collection('assessments').get();
  console.log('Assessments:', assSnap.size);
  assSnap.docs.slice(0, 2).forEach(d => console.log('ass:', d.id, d.data().matrixId, d.data().matrixVersion));
  
  const repSnap = await db.collection('reports').get();
  console.log('Reports:', repSnap.size);
  repSnap.docs.slice(0, 2).forEach(d => console.log('rep:', d.id));
}

check().catch(console.error);
