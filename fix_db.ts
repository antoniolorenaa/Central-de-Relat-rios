import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import * as xlsx from 'xlsx';
import fs from 'fs';

initializeApp({ projectId: 'ai-studio-77b98651-eb46-4ef0-aac8-0ad5067fb9fd' });
const db = getFirestore();

function normalizeKey(k: string) {
  return k.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function run() {
  const snap = await db.collection('matrices').where('status', '==', 'DRAFT').get();
  
  if (snap.empty) {
    console.log("No DRAFT matrix found.");
    return;
  }
  
  // Let's create the dummy file
  const data = [];
  const categoriesList = ['Linguagem', 'Matemática', 'Natureza', 'Sociedade', 'Artes'];
  let codeId = 1;
  for (let cat of categoriesList) {
    for (let i = 1; i <= 6; i++) {
      data.push({
        'Categoria ': cat, // Intentionally add a trailing space to test robust parsing
        'Código': `${cat.substring(0,3).toUpperCase()}0${i}`,
        Objetivo: `Objetivo ${i} de ${cat}`,
        Ordem: codeId,
        'Obrigatório': 'Sim'
      });
      codeId++;
    }
  }
  data.push({ 'Categoria ': 'Linguagem', 'Código': 'LIN07', Objetivo: 'Objetivo 7 de Linguagem', Ordem: 31, 'Obrigatório': 'Sim' });
  data.push({ 'Categoria ': 'Artes', 'Código': 'ART07', Objetivo: 'Objetivo 7 de Artes', Ordem: 32, 'Obrigatório': 'Sim' });

  const ws = xlsx.utils.json_to_sheet(data);
  const rows: any[] = xlsx.utils.sheet_to_json(ws);
  
  console.log("Linhas reconhecidas pelo leitor:", rows.length);
  if (rows.length > 0) {
    console.log("Cabeçalhos reconhecidos na primeira linha:", Object.keys(rows[0]));
  }

  const criteria: any[] = [];
  const categories = new Set<string>();

  rows.forEach((row, idx) => {
    const normalizedRow: any = {};
    for (const k of Object.keys(row)) {
      normalizedRow[normalizeKey(k)] = row[k];
    }

    const category = normalizedRow['categoria']?.toString().trim();
    const codeValue = normalizedRow['codigo']?.toString().trim();
    const objective = normalizedRow['objetivo']?.toString().trim();
    const orderRaw = normalizedRow['ordem']?.toString();
    const reqRaw = normalizedRow['obrigatorio']?.toString();
    
    if (!category || !codeValue || !objective) return;

    categories.add(category);
    
    let order = parseInt(orderRaw, 10);
    if (isNaN(order)) order = idx + 1;

    let required = true;
    if (reqRaw && (reqRaw.toLowerCase() === 'não' || reqRaw.toLowerCase() === 'nao' || reqRaw.toLowerCase() === 'false' || reqRaw === '0')) {
      required = false;
    }

    criteria.push({
      id: uuidv4(),
      code: codeValue,
      objective,
      category,
      order,
      required,
      active: true
    });
  });

  console.log("Critérios processados:", criteria.length);

  // Update the DB
  const doc = snap.docs[0];
  await doc.ref.update({
    categories: Array.from(categories),
    criteria: criteria.sort((a, b) => a.order - b.order),
    updatedAt: Date.now()
  });

  console.log("Matriz atualizada no banco com sucesso:", doc.id);
}
run().catch(console.error);
