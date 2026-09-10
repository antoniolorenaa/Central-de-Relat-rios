import * as xlsx from 'xlsx';

const data = [
  ['Categoria', 'Código', 'Objetivo', 'Ordem', 'Obrigatório'],
  ['O eu, o outro e o nós', 'EI02EO01', 'Demonstrar...', 1, 'Sim']
];

const ws = xlsx.utils.aoa_to_sheet(data);
const rows = xlsx.utils.sheet_to_json(ws);
console.log(rows);
