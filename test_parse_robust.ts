import * as xlsx from 'xlsx';

function normalizeKey(key: string) {
  return key.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const data = [
  { ' Categoria ': 'Matemática', ' Código ': 'MAT01', 'Objetivo ': 'Aprender', 'Ordem': 1, 'Obrigatório': 'Sim' }
];

const ws = xlsx.utils.json_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

const workbook = xlsx.read(buffer, { type: 'buffer' });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet);

rows.forEach((r: any) => {
  const normalizedRow: any = {};
  for (const k of Object.keys(r)) {
    normalizedRow[normalizeKey(k)] = r[k];
  }
  
  const category = normalizedRow['categoria']?.toString().trim();
  const code = normalizedRow['codigo']?.toString().trim();
  const objective = normalizedRow['objetivo']?.toString().trim();
  const orderRaw = normalizedRow['ordem']?.toString();
  const reqRaw = normalizedRow['obrigatorio']?.toString();
  
  console.log({ category, code, objective, orderRaw, reqRaw });
});
