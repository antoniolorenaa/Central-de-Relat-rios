import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Upload, FileUp, AlertCircle, CheckCircle2, History, X, Search, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Imports() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/admin/import/history', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.match(/\.(csv|xlsx|xls)$/i)) {
        setError('Utilize um arquivo CSV ou XLSX.');
        return;
      }
      if (selected.size > 10 * 1024 * 1024) {
        setError('O arquivo é muito grande. O limite é 10MB.');
        return;
      }
      setFile(selected);
      setPreview(null);
      setError(null);
      setSuccessData(null);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Selecione um arquivo para continuar.');
      return;
    }
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const idToken = await user?.getIdToken();
      if (!idToken) throw new Error('Sua sessão expirou. Entre novamente.');
      
      const res = await fetch('/api/admin/import/preview', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}` },
        body: formData
      });
      const data = await res.json();
      if (res.status === 403) throw new Error('Você não possui permissão para realizar importações.');
      if (!res.ok) throw new Error(data.error || 'Não foi possível analisar o arquivo. Verifique o formato e tente novamente.');
      
      setPreview(data);
      setFilter('ALL');
      setSearch('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeConfirm = async () => {
    if (!preview?.batch?.id) return;
    
    setConfirming(true);
    setError(null);
    setShowConfirmModal(false);

    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/admin/import/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ batchId: preview.batch.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na confirmação');
      
      setSuccessData(preview.batch);
      setFile(null);
      setPreview(null);
      fetchHistory(); // Refresh history
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  const filteredRows = preview?.previewRows?.filter((row: any) => {
    if (filter !== 'ALL') {
      if (filter === 'NEW' && row.status !== 'NEW_STUDENT' && row.status !== 'NEW_ENROLLMENT') return false;
      if (filter === 'UPDATE' && row.status !== 'UPDATE') return false;
      if (filter === 'UNCHANGED' && row.status !== 'UNCHANGED') return false;
      if (filter === 'INVALID' && row.status !== 'INVALID') return false;
      if (filter === 'CONFLICT' && row.status !== 'CONFLICT') return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (row.rawName || '').toLowerCase().includes(q) || (row.rawExternalId || '').toLowerCase().includes(q);
    }
    return true;
  });

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'NEW_STUDENT': return 'Novo Aluno';
      case 'NEW_ENROLLMENT': return 'Nova Matrícula';
      case 'UPDATE': return 'Atualização';
      case 'UNCHANGED': return 'Sem Alteração';
      case 'CONFLICT': return 'Conflito';
      case 'INVALID': return 'Inválido';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'NEW_STUDENT': return 'bg-green-100 text-green-800';
      case 'NEW_ENROLLMENT': return 'bg-blue-100 text-blue-800';
      case 'UPDATE': return 'bg-yellow-100 text-yellow-800';
      case 'UNCHANGED': return 'bg-gray-100 text-gray-800';
      case 'CONFLICT': return 'bg-orange-100 text-orange-800';
      case 'INVALID': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Importação de alunos</h1>
        <p className="text-gray-500 mt-1">Envie a listagem institucional para validar os dados antes da importação.</p>
      </div>

      {successData && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-900 mb-2">Importação concluída com sucesso.</h2>
            <div className="text-green-800 space-y-1 mb-6">
              <p>{successData.newStudents} alunos criados</p>
              <p>{successData.newEnrollments} matrículas criadas</p>
              <p>{successData.updatedEnrollments} atualizações</p>
              <p>{successData.unchangedRows} registros sem alteração</p>
            </div>
            <div className="flex justify-center space-x-4">
              <Button onClick={() => setSuccessData(null)} variant="outline" className="bg-white">Nova importação</Button>
              <Button onClick={() => navigate('/academic')}>Ver Turmas e Alunos</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!preview && !successData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-10 text-center bg-gray-50">
                  <FileSpreadsheet className="w-12 h-12 text-gray-400 mb-4" />
                  
                  {!file ? (
                    <>
                      <p className="text-sm text-gray-600 mb-4">Selecione o arquivo exportado pelo sistema acadêmico</p>
                      <div>
                        <input
                          type="file"
                          id="file-upload"
                          accept=".csv, .xlsx, .xls"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer inline-flex items-center justify-center rounded-lg font-medium transition-colors border border-gray-300 text-gray-700 hover:bg-gray-50 h-10 px-4 py-2 text-sm"
                        >
                          Selecionar arquivo
                        </label>
                      </div>
                    </>
                  ) : (
                    <div className="w-full max-w-md">
                      <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md mb-6">
                        <div className="flex items-center truncate">
                          <FileSpreadsheet className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
                          <div className="truncate text-left">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB • {file.name.split('.').pop()?.toUpperCase()}</p>
                          </div>
                        </div>
                        <button onClick={removeFile} className="text-gray-400 hover:text-red-500 p-1" disabled={loading}>
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <Button className="w-full" onClick={handleUpload} disabled={loading}>
                        {loading ? 'Analisando arquivo...' : 'Analisar arquivo'}
                      </Button>
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-md w-full max-w-md text-left flex items-start">
                      <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <History className="w-4 h-4 mr-2 text-gray-500" /> Histórico de Cargas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <p className="text-sm text-gray-500 text-center py-4">Carregando...</p>
                ) : history.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Nenhuma importação realizada.</p>
                ) : (
                  <div className="space-y-4">
                    {history.map(batch => (
                      <div key={batch.id} className="text-sm border-b border-gray-100 pb-3 last:border-0">
                        <p className="font-medium text-[#0f172a] truncate" title={batch.filename}>{batch.filename}</p>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-gray-500">
                            {new Date(batch.uploadedAt).toLocaleDateString('pt-BR')} • {batch.totalRows} linhas
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            batch.status === 'IMPORTED' ? 'bg-green-100 text-green-700' :
                            batch.status === 'PARTIALLY_IMPORTED' ? 'bg-yellow-100 text-yellow-700' :
                            batch.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {batch.status === 'READY_TO_IMPORT' ? 'Validado' :
                             batch.status === 'IMPORTING' ? 'Importando' :
                             batch.status === 'IMPORTED' ? 'Importado' :
                             batch.status === 'PARTIALLY_IMPORTED' ? 'Parcialmente importado' :
                             batch.status === 'FAILED' ? 'Falhou' : batch.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{batch.uploadedByName}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {preview && (
        <div className="space-y-6">
          {preview.batch.alreadyImportedWarning && (
            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 flex items-center">
              <AlertCircle className="w-5 h-5 mr-3" />
              <span>Este arquivo já foi importado anteriormente. Você pode analisá-lo novamente, mas os dados não serão duplicados.</span>
            </div>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-gray-500">Total Analisado</div>
                <div className="text-2xl font-bold text-[#0f172a]">{preview.batch.totalRows}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-gray-500">Válidas</div>
                <div className="text-2xl font-bold text-green-600">{preview.batch.validRows}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-gray-500">Inválidas</div>
                <div className="text-2xl font-bold text-red-600">{preview.batch.invalidRows}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-gray-500">Conflitos</div>
                <div className="text-2xl font-bold text-orange-600">{preview.batch.conflicts}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-gray-500">Novos Alunos</div>
                <div className="text-xl font-bold text-[#0f172a]">{preview.batch.newStudents}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-gray-500">Novas Matrículas</div>
                <div className="text-xl font-bold text-[#0f172a]">{preview.batch.newEnrollments}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-gray-500">Atualizações</div>
                <div className="text-xl font-bold text-[#0f172a]">{preview.batch.updatedEnrollments}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-gray-500">Sem Alteração</div>
                <div className="text-xl font-bold text-[#0f172a]">{preview.batch.unchangedRows}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div>
                <CardTitle>Prévia da Importação</CardTitle>
                <CardDescription>Mostrando até 100 linhas processadas</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar aluno ou matrícula..."
                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0f172a]"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select 
                  className="py-2 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0f172a]"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="ALL">Todos</option>
                  <option value="NEW">Novos</option>
                  <option value="UPDATE">Atualizações</option>
                  <option value="UNCHANGED">Sem alteração</option>
                  <option value="CONFLICT">Conflitos</option>
                  <option value="INVALID">Inválidos</option>
                </select>
                <Button variant="outline" onClick={() => setPreview(null)} disabled={confirming}>Cancelar</Button>
                <Button onClick={() => setShowConfirmModal(true)} disabled={confirming || preview.batch.validRows === 0 || preview.batch.conflicts > 0}>
                  Confirmar importação
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {preview.batch.conflicts > 0 && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md flex items-start">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                  <span>Existem {preview.batch.conflicts} conflitos na planilha. A importação está bloqueada até que sejam resolvidos no arquivo original.</span>
                </div>
              )}
              {error && <div className="mb-4 text-red-600 text-sm font-medium">{error}</div>}
              
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Linha</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Situação</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aluno</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matrícula</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidade</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Série/Prog</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turma/Turno</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observação</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRows.map((row: any) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3 text-sm text-gray-500">{row.rowNumber}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(row.status)}`}>
                            {getStatusLabel(row.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.rawName}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{row.rawExternalId}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{row.rawUnit}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{row.rawGradeLevelCombo}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{row.rawClassName} / {row.rawShift}</td>
                        <td className="px-4 py-3 text-sm text-red-600">{row.message}</td>
                      </tr>
                    ))}
                    {filteredRows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">Nenhum registro encontrado com os filtros atuais.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle>Confirmar importação</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Esta operação criará ou atualizará os registros acadêmicos apresentados no Preview. Deseja continuar?
              </p>
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setShowConfirmModal(false)}>Cancelar</Button>
                <Button onClick={executeConfirm} disabled={confirming}>
                  {confirming ? 'Gravando...' : 'Confirmar importação'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
