const fs = require('fs');
let code = fs.readFileSync('src/pages/Matrices.tsx', 'utf8');

// 1. Add `Eye`, `X` to lucide-react imports
code = code.replace(/import \{ Loader2, Plus, Upload, CheckCircle, FileText, AlertCircle, Archive, Trash2 \} from 'lucide-react';/,
  "import { Loader2, Plus, Upload, CheckCircle, FileText, AlertCircle, Archive, Trash2, Eye, X } from 'lucide-react';");

// 2. Add viewingMatrix state
code = code.replace(/const \[deleteError, setDeleteError\] = useState\(''\);/,
  "const [deleteError, setDeleteError] = useState('');\n  const [viewingMatrix, setViewingMatrix] = useState<Matrix | null>(null);");

// 3. Add 'Ver critérios' button
const searchBtn = `<div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0 justify-end">`;
const replaceBtn = `<div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0 justify-end">\n                        <Button variant="outline" className="text-gray-600 border-gray-200 hover:bg-gray-50 whitespace-nowrap" onClick={() => setViewingMatrix(matrix)}>\n                          <Eye className="w-4 h-4 mr-2" />\n                          Ver critérios\n                        </Button>`;
code = code.replace(searchBtn, replaceBtn);

// 4. Add the modal code
const searchModal = `    </div>\n  );\n}`;
const replaceModal = `      {viewingMatrix && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Visualização da Matriz
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {meta.gradeLevels?.find((g: any) => g.id === viewingMatrix.gradeLevelId)?.name || viewingMatrix.gradeLevelId} • {viewingMatrix.schoolYear} • {viewingMatrix.period} • {viewingMatrix.brandId === 'GLOBAL' ? 'GLOBAL' : meta.brands?.find((b: any) => b.id === viewingMatrix.brandId)?.name || viewingMatrix.brandId} • {viewingMatrix.programId === 'ALL' ? 'Todos os Programas' : meta.programs?.find((p: any) => p.id === viewingMatrix.programId)?.name || viewingMatrix.programId} • v{viewingMatrix.version} • {viewingMatrix.status}
                </p>
              </div>
              <button onClick={() => setViewingMatrix(null)} className="text-gray-400 hover:text-gray-600 rounded-full p-2 hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-4 flex-1 overflow-y-auto">
              <div className="mb-6 flex gap-4 text-sm font-medium text-gray-600 bg-gray-100 p-3 rounded-lg border border-gray-200">
                <div>Total de categorias: <span className="text-gray-900">{viewingMatrix.categories.length}</span></div>
                <div>Total de critérios: <span className="text-gray-900">{viewingMatrix.criteria.length}</span></div>
              </div>

              {Object.entries(
                viewingMatrix.criteria.reduce((acc, crit) => {
                  const cat = crit.category || 'Sem categoria';
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(crit);
                  return acc;
                }, {} as Record<string, typeof viewingMatrix.criteria>)
              )
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([category, criteria]) => (
                  <div key={category} className="mb-8 last:mb-0">
                    <h4 className="font-bold text-gray-800 text-lg mb-3 flex items-center justify-between border-b pb-2">
                      {category}
                      <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{criteria.length} critérios</span>
                    </h4>
                    <div className="space-y-3">
                      {[...criteria]
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                        .map(crit => (
                          <div key={crit.id} className="bg-white border border-gray-200 p-4 rounded-lg hover:border-gray-300 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="font-mono text-xs font-semibold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border">{crit.code}</span>
                                  {crit.required && <span className="text-[10px] uppercase font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">Obrigatório</span>}
                                  <span className="text-xs text-gray-400">Ordem: {crit.order}</span>
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed">{crit.objective}</p>
                              </div>
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;
code = code.replace(searchModal, replaceModal);

fs.writeFileSync('src/pages/Matrices.tsx', code);
