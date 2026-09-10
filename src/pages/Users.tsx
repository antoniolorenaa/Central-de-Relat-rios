import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { collection, getDocs, doc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { UserProfile, Brand, Unit, GradeLevel, Scope } from '../types';
import { Plus, Edit2, ShieldBan, ShieldCheck } from 'lucide-react';

export function Users() {
  const { profile, user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const fetchUsers = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const grantsSnap = await getDocs(collection(db, 'accessGrants'));
      
      const fetchedUsers = usersSnap.docs.map(d => d.data());
      const unlinkedGrants = grantsSnap.docs
        .map(d => d.data())
        .filter((g: any) => !g.linkedFirebaseUid);
      
      const merged = [
        ...fetchedUsers,
        ...unlinkedGrants.map((g: any) => ({
          id: g.emailNormalized,
          email: g.emailNormalized,
          name: g.name,
          role: g.role,
          scopes: g.scopes,
          active: g.active,
          isPendingGrant: true
        }))
      ];
      setUsers(merged);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (profile?.role !== 'MASTER') return;

    fetchUsers();

    getDocs(collection(db, 'brands')).then(s => setBrands(s.docs.map(d => d.data() as Brand)));
    getDocs(collection(db, 'units')).then(s => setUnits(s.docs.map(d => d.data() as Unit)));
    getDocs(collection(db, 'gradeLevels')).then(s => setGradeLevels(s.docs.map(d => d.data() as GradeLevel)));
  }, [profile, user]);

  if (profile?.role !== 'MASTER') {
    return <div className="text-red-500">Acesso negado.</div>;
  }

  const handleToggleActive = async (u: any) => {
    if (u.active) {
      if (!window.confirm(`Tem certeza que deseja desativar o acesso de ${u.name}?`)) return;
    }
    try {
      const { updateDoc } = await import('firebase/firestore');
      const updates = { active: !u.active, updatedAt: Date.now() };
      
      if (u.isPendingGrant) {
        await updateDoc(doc(db, 'accessGrants', u.id), updates);
      } else {
        await updateDoc(doc(db, 'users', u.id), updates);
      }
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar status');
    }
  };

  const openEdit = (u: any) => {
    setEditingUser(u);
    setIsModalOpen(true);
  };

  const openNew = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Usuários</h1>
          <p className="text-gray-500 mt-1">Gerencie os acessos à plataforma.</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Novo acesso
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium">Nome</th>
                <th className="px-6 py-4 font-medium">E-mail</th>
                <th className="px-6 py-4 font-medium">Perfil</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{u.name}</td>
                  <td className="px-6 py-4 text-gray-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800">
                      {u.role === 'MASTER' ? 'Mestre' : 'Coordenação'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {u.active ? (
                      <span className="inline-flex items-center text-green-600 font-medium">
                        <ShieldCheck className="w-4 h-4 mr-1.5" /> Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-red-600 font-medium">
                        <ShieldBan className="w-4 h-4 mr-1.5" /> Inativo
                      </span>
                    )}
                    {u.isPendingGrant && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800">
                        Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className={u.active ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'} onClick={() => handleToggleActive(u)}>
                      {u.active ? <ShieldBan className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    </Button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {isModalOpen && (
        <UserModal
          user={editingUser}
          brands={brands}
          units={units}
          gradeLevels={gradeLevels}
          onClose={(reload?: boolean) => {
            setIsModalOpen(false);
            if (reload) fetchUsers();
          }}
        />
      )}
    </div>
  );
}

function UserModal({ user, brands, units, gradeLevels, onClose }: any) {
  const { user: authUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(user?.role || 'COORDINATION');
  const [scopes, setScopes] = useState<Scope[]>(user?.scopes || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { setDoc, updateDoc, getDoc, collection, query, where, getDocs } = await import('firebase/firestore');

      if (user) {
        // Edit
        const updates: any = { updatedAt: Date.now() };
        if (name !== undefined) updates.name = name;
        if (role !== undefined) updates.role = role;
        if (scopes !== undefined) updates.scopes = scopes;

        if (user.isPendingGrant) {
          await updateDoc(doc(db, 'accessGrants', user.id), updates);
        } else {
          await updateDoc(doc(db, 'users', user.id), updates);
        }
      } else {
        // Create new
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', normalizedEmail));
        const existingUsers = await getDocs(q);
        
        if (!existingUsers.empty) {
          throw new Error('E-mail já possui usuário vinculado.');
        }

        const grantRef = doc(db, 'accessGrants', normalizedEmail);
        const grantSnap = await getDoc(grantRef);
        if (grantSnap.exists()) {
          throw new Error('E-mail já possui pré-autorização ativa.');
        }

        const newGrant = {
          id: normalizedEmail,
          name,
          emailNormalized: normalizedEmail,
          role,
          scopes: scopes || [],
          active: true,
          createdBy: authUser?.uid,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          linkedFirebaseUid: null
        };

        await setDoc(grantRef, newGrant);
      }

      onClose(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addScope = () => setScopes([...scopes, { brandId: '', unitId: '', gradeLevelIds: [] }]);
  
  const updateScope = (index: number, field: keyof Scope, value: any) => {
    const newScopes = [...scopes];
    newScopes[index] = { ...newScopes[index], [field]: value };
    setScopes(newScopes);
  };
  
  const removeScope = (index: number) => {
    setScopes(scopes.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{user ? 'Editar Acesso' : 'Novo Acesso'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Nome completo</label>
              <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] outline-none transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">E-mail</label>
              <input required disabled={!!user} type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Perfil de Acesso</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] outline-none transition-all">
              <option value="COORDINATION">Coordenação</option>
              <option value="MASTER">Mestre</option>
            </select>
          </div>

          {role === 'COORDINATION' && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Escopos Autorizados</h3>
                <Button type="button" variant="outline" size="sm" onClick={addScope}>Adicionar Escopo</Button>
              </div>

              {scopes.length === 0 && (
                <p className="text-sm text-gray-500 italic">Nenhum escopo definido. O usuário não terá acesso a nenhuma unidade.</p>
              )}

              {scopes.map((scope, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                  <div className="flex justify-end">
                    <button type="button" onClick={() => removeScope(index)} className="text-xs text-red-600 font-medium hover:underline">Remover Escopo</button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-700">Marca</label>
                      <select required value={scope.brandId} onChange={e => updateScope(index, 'brandId', e.target.value)} className="w-full h-9 px-3 text-sm rounded-md border border-gray-300 outline-none">
                        <option value="">Selecione...</option>
                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-700">Unidade</label>
                      <select required value={scope.unitId || ''} onChange={e => updateScope(index, 'unitId', e.target.value)} disabled={!scope.brandId} className="w-full h-9 px-3 text-sm rounded-md border border-gray-300 outline-none disabled:bg-gray-100">
                        <option value="">Todas as unidades...</option>
                        {units.filter(u => u.brandId === scope.brandId).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">Séries Permitidas</label>
                    <div className="grid grid-cols-3 gap-2">
                      {gradeLevels.map(gl => (
                        <label key={gl.id} className="flex items-center space-x-2 text-sm text-gray-700">
                          <input 
                            type="checkbox" 
                            checked={scope.gradeLevelIds?.includes(gl.id) || false}
                            onChange={(e) => {
                              const curr = scope.gradeLevelIds || [];
                              if (e.target.checked) updateScope(index, 'gradeLevelIds', [...curr, gl.id]);
                              else updateScope(index, 'gradeLevelIds', curr.filter(id => id !== gl.id));
                            }}
                            className="rounded border-gray-300 text-[#0f172a] focus:ring-[#0f172a]"
                          />
                          <span>{gl.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="pt-6 border-t border-gray-100 flex justify-end space-x-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
