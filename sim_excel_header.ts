import * as xlsx from 'xlsx';

// Simulate an excel with title on row 1, headers on row 2
const data = [
  ['Matriz Infantil 2', '', '', '', ''],
  ['Categoria', 'Código', 'Objetivo', 'Ordem', 'Obrigatório'],
  ['Linguagem', 'LIN01', 'Objetivo teste', 1, 'Sim']
];

const ws = xlsx.utils.aoa_to_sheet(data);
const rows = xlsx.utils.sheet_to_json(ws);
console.log(rows);
