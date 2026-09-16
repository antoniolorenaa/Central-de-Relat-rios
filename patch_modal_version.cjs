const fs = require('fs');
let code = fs.readFileSync('src/pages/Matrices.tsx', 'utf8');

const targetModal = `<p>Série: {meta.gradeLevels?.find((g: any) => g.id === matrixToDelete.gradeLevelId)?.name || matrixToDelete.gradeLevelId} • Ano: {matrixToDelete.schoolYear} • Período: {matrixToDelete.period}</p>`;

const newModal = `<p>Série: {meta.gradeLevels?.find((g: any) => g.id === matrixToDelete.gradeLevelId)?.name || matrixToDelete.gradeLevelId} • Ano: {matrixToDelete.schoolYear} • Período: {matrixToDelete.period} • Marca: {meta.brands?.find((b: any) => b.id === matrixToDelete.brandId)?.name || matrixToDelete.brandId} • Programa: {meta.programs?.find((p: any) => p.id === matrixToDelete.programId)?.name || matrixToDelete.programId} • Versão: v{matrixToDelete.version}</p>`;

code = code.replace(targetModal, newModal);
fs.writeFileSync('src/pages/Matrices.tsx', code);
