import * as xlsx from 'xlsx';

const data = [
  ['Categoria', 'Código', 'Objetivo', 'Ordem', 'Obrigatório'],
  ['O eu, o outro e o nós', 'EI02EO01', 'Demonstrar atitudes de cuidado e solidariedade na interação com crianças e adultos.', '1', 'Sim'],
  ['O eu, o outro e o nós', 'EI02EO02', 'Demonstrar imagem positiva de si e confiança em sua capacidade para enfrentar dificuldades e desafios.', '2', 'Sim'],
];

const ws = xlsx.utils.aoa_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Matriz Infantil 2");
const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

const workbook = xlsx.read(buffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rows = xlsx.utils.sheet_to_json(sheet);

console.log("Aba lida:", sheetName);
console.log("Quantidade de linhas (excluindo cabeçalho):", rows.length);
if (rows.length > 0) {
    console.log("Cabeçalhos extraídos:", Object.keys(rows[0]));
}

let accepted = 0;
let rejected = 0;
const rejectedDetails: string[] = [];

function normalizeKey(k: string) {
  return k.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

rows.forEach((row: any, idx: number) => {
  const normalizedRow: any = {};
  for (const k of Object.keys(row)) {
    normalizedRow[normalizeKey(k)] = row[k];
  }

  const category = normalizedRow['categoria']?.toString().trim();
  const codeValue = normalizedRow['codigo']?.toString().trim();
  const objective = normalizedRow['objetivo']?.toString().trim();
  
  if (!category || !codeValue || !objective) {
      rejected++;
      rejectedDetails.push(`Linha ${idx + 2}: Faltam campos obrigatórios (Categoria, Código ou Objetivo). Dados encontrados: ${JSON.stringify(normalizedRow)}`);
      return;
  }
  accepted++;
});

console.log(`Aceitas: ${accepted}, Rejeitadas: ${rejected}`);
if (rejected > 0) {
    console.log("Motivos das rejeições:\n", rejectedDetails.join("\n"));
}

