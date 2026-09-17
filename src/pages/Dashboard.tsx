import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Building2, GraduationCap, Users, BookOpen } from 'lucide-react';

export function Dashboard() {
  const { profile, user } = useAuth();
  
  if (profile?.role === 'MASTER') {
    return <MasterHome />;
  }

  return <CoordinationHome />;
}

function MasterHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    brands: 0,
    units: 0,
    gradeLevels: 0,
    programs: 0,
    classes: 0,
    students: 0,
    users: 0,
    coordinations: 0
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const token = await user?.getIdToken();
        const res = await fetch('/api/admin/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
        } else {
          console.warn("Stats API error:", data.error);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadStats();
  }, [user]);

  const initSeed = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/seed', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        window.location.reload();
      } else {
        console.error("Erro ao realizar Seed: " + data.error);
      }
    } catch (err: any) {
      console.error("Erro ao realizar Seed: " + err.message);
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Visão Geral</h1>
        <p className="text-gray-500 mt-1">Acompanhamento estrutural da Central de Relatórios Pedagógicos.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Marcas Registradas</CardTitle>
            <Building2 className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#0f172a]">{stats.brands}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Unidades</CardTitle>
            <Building2 className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#0f172a]">{stats.units}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Séries Iniciais</CardTitle>
            <GraduationCap className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#0f172a]">{stats.gradeLevels}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Programas</CardTitle>
            <BookOpen className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#0f172a]">{stats.programs || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Turmas Ativas</CardTitle>
            <Users className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#0f172a]">{stats.classes || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Alunos Ativos</CardTitle>
            <Users className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#0f172a]">{stats.students || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Usuários Ativos</CardTitle>
            <Users className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#0f172a]">{stats.users}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Coordenações</CardTitle>
            <Users className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#0f172a]">{stats.coordinations}</div>
          </CardContent>
        </Card>
      </div>

      {stats.brands === 0 && (
        <div className="p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-100 flex justify-between items-center">
          <span>A estrutura institucional ainda não foi inicializada.</span>
          <button onClick={initSeed} className="text-sm font-semibold hover:underline">Inicializar Dados</button>
        </div>
      )}

      <div className="pt-8">
        <h3 className="text-lg font-semibold text-[#0f172a] mb-2">Próxima etapa do projeto</h3>
        <p className="text-sm text-gray-500">
          A estrutura institucional e os acessos estão configurados. Os módulos pedagógicos serão adicionados nas próximas etapas.
        </p>
      </div>
    </div>
  );
}

function CoordinationHome() {
  const { profile } = useAuth();
  const [error, setError] = useState<string>('');
  const [brands, setBrands] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [gradeLevels, setGradeLevels] = useState<any[]>([]);
  

  useEffect(() => {
    async function loadStructure() {
      try {
        const [bSnap, uSnap, glSnap] = await Promise.all([
          getDocs(collection(db, 'brands')),
          getDocs(collection(db, 'units')),
          getDocs(collection(db, 'gradeLevels'))
        ]);
        setBrands(bSnap.docs.map(d => d.data()));
        setUnits(uSnap.docs.map(d => d.data()));
        setGradeLevels(glSnap.docs.map(d => d.data()));
      } catch (error: any) {
        if (error?.code === 'resource-exhausted' || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.message?.includes('Quota exceeded')) {
           setError('Aviso: Limite de cota do banco de dados atingido (RESOURCE_EXHAUSTED). Os dados podem não ser carregados.');
        } else {
           console.error(error);
        }
      }
    }
    loadStructure();
  }, []);

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6 flex items-center">
          <span className="font-medium">{error}</span>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Meu acesso</h1>
        <p className="text-gray-500 mt-1">Sua estrutura de trabalho autorizada.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {profile?.scopes?.map((scope, idx) => {
          const brand = brands.find(b => b.id === scope.brandId);
          const unit = units.find(u => u.id === scope.unitId);
          const gLevels = gradeLevels.filter(gl => scope.gradeLevelIds?.includes(gl.id));

          return (
            <Card key={idx}>
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle>{brand?.name || 'Marca Desconhecida'}</CardTitle>
                <p className="text-sm font-medium text-gray-500">{unit?.name}</p>
              </CardHeader>
              <CardContent className="pt-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Séries Autorizadas</h4>
                {gLevels.length > 0 ? (
                  <ul className="space-y-2">
                    {gLevels.map(gl => (
                      <li key={gl.id} className="text-sm font-medium text-[#0f172a] bg-gray-50 px-3 py-2 rounded-md">
                        {gl.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 italic">Nenhuma série vinculada</p>
                )}
              </CardContent>
            </Card>
          );
        })}

        {(!profile?.scopes || profile.scopes.length === 0) && (
          <div className="col-span-full p-6 bg-gray-50 rounded-xl border border-gray-200 text-center text-gray-500">
            Nenhum escopo de acesso configurado para o seu perfil.
          </div>
        )}
      </div>

      <div className="p-6 bg-blue-50 text-blue-900 rounded-xl border border-blue-100">
        <p className="text-sm font-medium">As turmas vinculadas ao seu acesso serão exibidas aqui quando o módulo acadêmico for configurado.</p>
      </div>
    </div>
  );
}
