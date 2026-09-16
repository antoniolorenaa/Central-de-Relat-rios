import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Loader2, Plus, Trash2, CheckCircle, AlertCircle, ArrowLeft, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Matrix, MatrixCriterion } from '../types';
import { useAuth } from '../lib/auth';

interface MatrixEditorProps {
  matrix: Matrix;
  meta: any;
  onCancel: () => void;
  onSaveSuccess: () => void;
  onConflict: (draftId: string) => void;
}

export function MatrixEditor({ matrix, meta, onCancel, onSaveSuccess, onConflict }: MatrixEditorProps) {
  const { user } = useAuth();
  
  const [brandId, setBrandId] = useState(matrix.brandId);
  const [gradeLevelId, setGradeLevelId] = useState(matrix.gradeLevelId);
  const [programId, setProgramId] = useState(matrix.programId);
  const [schoolYear, setSchoolYear] = useState(matrix.schoolYear);
  const [period, setPeriod] = useState(matrix.period);
  
  // Clone criteria to avoid mutating prop
  const [criteria, setCriteria] = useState<MatrixCriterion[]>(
    matrix.criteria.map(c => ({ ...c }))
  );
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Check if anything changed
  const isDirty = () => {
    if (brandId !== matrix.brandId) return true;
    if (gradeLevelId !== matrix.gradeLevelId) return true;
    if (programId !== matrix.programId) return true;
    if (schoolYear !== matrix.schoolYear) return true;
    if (period !== matrix.period) return true;
    if (JSON.stringify(criteria) !== JSON.stringify(matrix.criteria)) return true;
    return false;
  };

  const handleCancel = () => {
    if (isDirty()) {
      if (!window.confirm('Existem alterações pendentes. Deseja realmente descartar e sair?')) {
        return;
      }
    }
    onCancel();
  };

  const handleAddCriterion = () => {
    const nextOrder = criteria.length > 0 ? Math.max(...criteria.map(c => c.order)) + 1 : 1;
    setCriteria([...criteria, {
      id: uuidv4(),
      code: '',
      objective: '',
      category: '',
      order: nextOrder,
      required: false,
      active: true
    }]);
  };

  const handleRemoveCriterion = (id: string) => {
    setCriteria(criteria.filter(c => c.id !== id));
  };

  const handleCriterionChange = (id: string, field: keyof MatrixCriterion, value: any) => {
    setCriteria(criteria.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleMarkAllRequired = (required: boolean) => {
    setCriteria(criteria.map(c => ({ ...c, required })));
  };

  const handleSave = async () => {
    if (isSaving) return;
    
    // Client-side validations
    if (!brandId || !gradeLevelId || !programId || !schoolYear || !period) {
      setError('Preencha todos os campos de cabeçalho.');
      return;
    }
    if (criteria.length === 0) {
      setError('A matriz precisa ter pelo menos um critério.');
      return;
    }
    const codes = new Set();
    for (const c of criteria) {
      if (!c.code || !c.objective || !c.category) {
        setError(`Preencha código, objetivo e categoria para todos os critérios.`);
        return;
      }
      if (codes.has(c.code)) {
        setError(`Código duplicado: ${c.code}`);
        return;
      }
      codes.add(c.code);
    }

    setIsSaving(true);
    setError('');

    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/admin/matrices/${matrix.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          brandId,
          gradeLevelId,
          programId,
          schoolYear,
          period,
          criteria,
          expectedRevision: (matrix as any).revision || 0
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 409 && data.existingDraftId) {
          if (window.confirm(`${data.error} Deseja abrir o rascunho existente?`)) {
            onConflict(data.existingDraftId);
          } else {
            setError(data.error);
          }
          setIsSaving(false);
          return;
        }
        throw new Error(data.error || 'Erro ao salvar matriz.');
      }
      
      onSaveSuccess();
    } catch (e: any) {
      setError(e.message);
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <button onClick={handleCancel} className="text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Editar Matriz</h1>
          </div>
          <p className="text-gray-500 mt-1 ml-7">
            {matrix.status === 'DRAFT' ? 'Editando rascunho atual.' : 'As alterações serão salvas em um novo rascunho. Avaliações existentes continuarão vinculadas à versão anterior.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 border border-red-100">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Configuração da Matriz</CardTitle>
          <CardDescription>Defina para qual contexto esta matriz se aplica.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <select value={brandId} onChange={e => setBrandId(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="GLOBAL">Todas as Marcas (Global)</option>
                {meta.brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Série</label>
              <select value={gradeLevelId} onChange={e => setGradeLevelId(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="">Selecione...</option>
                {meta.gradeLevels.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Programa</label>
              <select value={programId} onChange={e => setProgramId(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="ALL">Todos os Programas</option>
                {meta.programs.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano Escolar</label>
              <select value={schoolYear} onChange={e => setSchoolYear(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
              <select value={period} onChange={e => setPeriod(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="S1">Semestre 1</option>
                <option value="S2">Semestre 2</option>
                <option value="T1">Trimestre 1</option>
                <option value="T2">Trimestre 2</option>
                <option value="T3">Trimestre 3</option>
                <option value="B1">Bimestre 1</option>
                <option value="B2">Bimestre 2</option>
                <option value="B3">Bimestre 3</option>
                <option value="B4">Bimestre 4</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mb-4 mt-8">
        <h3 className="text-lg font-bold text-gray-900">Critérios ({criteria.length})</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleMarkAllRequired(true)}>Marcar todos como obrigatórios</Button>
          <Button variant="outline" size="sm" onClick={() => handleMarkAllRequired(false)}>Desmarcar todos</Button>
          <Button onClick={handleAddCriterion} size="sm" className="bg-gray-900 text-white hover:bg-gray-800">
            <Plus className="w-4 h-4 mr-1" /> Novo Critério
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {criteria.sort((a, b) => a.order - b.order).map((crit) => (
          <div key={crit.id} className="bg-white border border-gray-200 rounded-lg p-4 flex gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Categoria</label>
                <input 
                  type="text" 
                  value={crit.category} 
                  onChange={e => handleCriterionChange(crit.id, 'category', e.target.value)}
                  className="w-full border-gray-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Leitura"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Código</label>
                <input 
                  type="text" 
                  value={crit.code} 
                  onChange={e => handleCriterionChange(crit.id, 'code', e.target.value)}
                  className="w-full border-gray-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono"
                  placeholder="Ex: EF15LP01"
                />
              </div>
              <div className="md:col-span-7">
                <label className="block text-xs font-medium text-gray-500 mb-1">Objetivo / Descrição</label>
                <textarea 
                  value={crit.objective} 
                  onChange={e => handleCriterionChange(crit.id, 'objective', e.target.value)}
                  className="w-full border-gray-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                />
              </div>
              <div className="md:col-span-6 flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-500">Ordem:</label>
                  <input 
                    type="number" 
                    value={crit.order} 
                    onChange={e => handleCriterionChange(crit.id, 'order', parseInt(e.target.value) || 0)}
                    className="w-20 border-gray-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={crit.required} 
                    onChange={e => handleCriterionChange(crit.id, 'required', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 font-medium">Obrigatório</span>
                </label>
              </div>
            </div>
            <div className="flex items-start">
              <button onClick={() => handleRemoveCriterion(crit.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Remover">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {criteria.length === 0 && (
          <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-lg text-gray-500">
            Nenhum critério adicionado. Clique no botão acima para adicionar.
          </div>
        )}
      </div>
    </div>
  );
}
