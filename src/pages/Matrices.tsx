import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Loader2, Plus, Upload, CheckCircle, FileText, AlertCircle, Archive, Trash2, Eye, X } from 'lucide-react';
import type { Matrix } from '../types';

export function Matrices() {
  const { user, profile } = useAuth();
  const [matrices, setMatrices] = useState<Matrix[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [brandId, setBrandId] = useState('GLOBAL');
  const [gradeLevelId, setGradeLevelId] = useState('');
  const [programId, setProgramId] = useState('ALL');
  const [schoolYear, setSchoolYear] = useState('2026');
  const [period, setPeriod] = useState('S1');
  const [file, setFile] = useState<File | null>(null);

  const [meta, setMeta] = useState<any>({ brands: [], gradeLevels: [], programs: [] });
  
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [confirmPublishId, setConfirmPublishId] = useState<string | null>(null);
  const [matrixToDelete, setMatrixToDelete] = useState<Matrix | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [viewingMatrix, setViewingMatrix] = useState<Matrix | null>(null);

  useEffect(() => {
    fetchMeta();
    fetchMatrices();
  }, []);

  
  const handleDeleteMatrix = async () => {
    if (!matrixToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      setDeleteError('');
      const token = await user?.getIdToken();
      const res = await fetch(`/api/admin/matrices/${matrixToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir');
      
      setMatrices(prev => prev.filter(m => m.id !== matrixToDelete.id));
      setMatrixToDelete(null);
      setDeleteError('');
    } catch(err: any) {
      setDeleteError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  

  const fetchMeta = async () => {
    try {
      const token = await user?.getIdToken();
      // We can use the classes endpoint to get meta, but it's better to fetch directly.
      // Wait, let's just fetch from /api/academic/classes? just to get meta.
      const res = await fetch('/api/academic/classes?schoolYear=2026', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success && data.meta) {
        setMeta(data.meta);
      }
    } catch(e) {}
  };

  const fetchMatrices = async () => {
    setLoading(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/matrices', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMatrices(data.matrices);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file || !gradeLevelId) {
      setError('Série e arquivo são obrigatórios.');
      return;
    }
    setImporting(true);
    setError('');

    try {
      const token = await user?.getIdToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('brandId', brandId);
      formData.append('gradeLevelId', gradeLevelId);
      formData.append('programId', programId);
      formData.append('schoolYear', schoolYear);
      formData.append('period', period);


      const res = await fetch('/api/admin/matrices/import', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || 'Erro ao importar matriz.');
        } else {
          setFile(null);
          fetchMatrices();
        }
      } else {
        const text = await res.text();
        console.error("HTML Error Response:", text);
        setError(`Erro no servidor (Status ${res.status}): A resposta não foi em formato JSON.`);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  };

  const publishMatrix = async (id: string) => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/admin/matrices/${id}/publish`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Erro ao publicar.');
      } else {
        setConfirmPublishId(null);
        fetchMatrices();
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (profile?.role !== 'MASTER') return <div className="p-12 text-center text-gray-500">Acesso negado.</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Matrizes Avaliativas</h1>
        <p className="text-gray-500 mt-1">Gerencie os currículos e campos de experiência.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Upload Form */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nova Matriz (Importação)</CardTitle>
              <CardDescription>Faça upload de um arquivo CSV ou XLSX.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {error && (
                <div className="p-3 text-sm text-red-800 bg-red-50 rounded-md flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ano Letivo</label>
                <select value={schoolYear} onChange={e => setSchoolYear(e.target.value)} className="w-full text-sm border-gray-300 rounded-md">
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                <select value={period} onChange={e => setPeriod(e.target.value)} className="w-full text-sm border-gray-300 rounded-md">
                  <option value="1">1º Bimestre</option>
                  <option value="2">2º Bimestre</option>
                  <option value="3">3º Bimestre</option>
                  <option value="4">4º Bimestre</option>
                  <option value="S1">1º Semestre</option>
                  <option value="S2">2º Semestre</option>
                  <option value="T1">1º Trimestre</option>
                  <option value="T2">2º Trimestre</option>
                  <option value="T3">3º Trimestre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Série *</label>
                <select value={gradeLevelId} onChange={e => setGradeLevelId(e.target.value)} className="w-full text-sm border-gray-300 rounded-md">
                  <option value="">Selecione...</option>
                  {meta.gradeLevels.map((gl: any) => (
                    <option key={gl.id} value={gl.id}>{gl.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                <select value={brandId} onChange={e => setBrandId(e.target.value)} className="w-full text-sm border-gray-300 rounded-md">
                  <option value="GLOBAL">GLOBAL (Todas)</option>
                  {meta.brands.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Programa</label>
                <select value={programId} onChange={e => setProgramId(e.target.value)} className="w-full text-sm border-gray-300 rounded-md">
                  <option value="ALL">ALL (Todos)</option>
                  {meta.programs.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo (CSV, XLSX)</label>
                <input 
                  type="file" 
                  accept=".csv, .xlsx, .xls"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-2">O arquivo deve conter as colunas: Categoria, Código, Objetivo, Ordem, Obrigatório.</p>
              </div>

              <Button onClick={handleImport} disabled={importing || !file || !gradeLevelId} className="w-full">
                {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                Importar como DRAFT
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Matrices List */}
        <div className="md:col-span-2">
          <Card className="h-full min-h-[500px]">
            <CardHeader>
              <CardTitle>Matrizes Cadastradas</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
              ) : matrices.length === 0 ? (
                <div className="text-center p-12 text-gray-500">Nenhuma matriz encontrada.</div>
              ) : (
                <div className="space-y-4">
                  {matrices.map(matrix => {
                    const gradeLevelName = meta.gradeLevels.find((gl: any) => gl.id === matrix.gradeLevelId)?.name || matrix.gradeLevelId;
                    const brandName = matrix.brandId === 'GLOBAL' ? 'GLOBAL' : meta.brands.find((b: any) => b.id === matrix.brandId)?.name || matrix.brandId;
                    const programName = matrix.programId === 'ALL' ? 'Todos os Programas' : meta.programs.find((p: any) => p.id === matrix.programId)?.name || matrix.programId;
                    
                    return (
                      <div key={matrix.id} className={`border rounded-lg p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${matrix.status === 'PUBLISHED' ? 'border-green-200 bg-green-50/30' : matrix.status === 'DRAFT' ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-75'}`}>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-[#0f172a] text-lg">{gradeLevelName}</h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              matrix.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 
                              matrix.status === 'DRAFT' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-700'
                            }`}>
                              {matrix.status}
                            </span>
                            <span className="text-xs text-gray-500 bg-white border px-1.5 py-0.5 rounded">v{matrix.version}</span>
                          </div>
                          
                          <div className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1 mb-3">
                            <div><span className="font-medium text-gray-900">Ano:</span> {matrix.schoolYear}</div>
                            <div><span className="font-medium text-gray-900">Período:</span> {matrix.period}</div>
                            <div><span className="font-medium text-gray-900">Marca:</span> {brandName}</div>
                            <div><span className="font-medium text-gray-900">Prog:</span> {programName}</div>
                          </div>
                          
                          <div className="text-sm text-gray-500 flex items-center gap-3">
                            <div className="flex items-center"><FileText className="w-4 h-4 mr-1" /> {matrix.criteria.length} critérios</div>
                            <div className="flex items-center"><FileText className="w-4 h-4 mr-1" /> {matrix.categories.length} categorias</div>
                          </div>
                        </div>                      <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0 justify-end">
                        <Button variant="outline" className="text-gray-600 border-gray-200 hover:bg-gray-50 whitespace-nowrap" onClick={() => setViewingMatrix(matrix)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver critérios
                        </Button>
                        {matrix.status === 'DRAFT' && confirmPublishId !== matrix.id && (
                          <>
                            <Button variant="outline" className="text-green-700 border-green-200 hover:bg-green-50 whitespace-nowrap" onClick={() => setConfirmPublishId(matrix.id)}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Publicar
                            </Button>
                            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 whitespace-nowrap" onClick={() => { setDeleteError(''); setMatrixToDelete(matrix); }}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir rascunho
                            </Button>
                          </>
                        )}
                        {matrix.status === 'DRAFT' && confirmPublishId === matrix.id && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button variant="outline" className="whitespace-nowrap" onClick={() => setConfirmPublishId(null)}>
                              Cancelar
                            </Button>
                            <Button className="bg-green-600 hover:bg-green-700 whitespace-nowrap" onClick={() => publishMatrix(matrix.id)}>
                              Confirmar Publicação
                            </Button>
                          </div>
                        )}
                        {matrix.status === 'PUBLISHED' && (
                          <div className="text-sm text-green-700 font-medium flex items-center">
                            <CheckCircle className="w-4 h-4 mr-1" /> Ativa
                          </div>
                        )}
                        {matrix.status === 'ARCHIVED' && (
                          <div className="text-sm text-gray-500 font-medium flex items-center">
                            <Archive className="w-4 h-4 mr-1" /> Arquivada
                          </div>
                        )}
                      </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

            </div>      <ConfirmModal
        isOpen={!!matrixToDelete}
        title="Excluir Rascunho"
        message={matrixToDelete ? `Deseja realmente excluir o rascunho da matriz "${meta.gradeLevels?.find((g: any) => g.id === matrixToDelete.gradeLevelId)?.name || matrixToDelete.gradeLevelId}" (Ano: ${matrixToDelete.schoolYear}, Período: ${matrixToDelete.period}, Marca: ${meta.brands?.find((b: any) => b.id === matrixToDelete.brandId)?.name || matrixToDelete.brandId}, Programa: ${meta.programs?.find((p: any) => p.id === matrixToDelete.programId)?.name || matrixToDelete.programId})?` : ''}
        confirmText={isDeleting ? "Excluindo..." : "Sim, Excluir"}
        cancelText="Cancelar"
        onConfirm={handleDeleteMatrix}
        onCancel={() => {
          if (!isDeleting) {
            setMatrixToDelete(null);
            setDeleteError('');
          }
        }}
        isLoading={isDeleting}
        error={deleteError}
      />
      {viewingMatrix && (
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
                }, {} as Record<string, any[]>)
              )
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([category, criteria]: [string, any]) => (
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
}

