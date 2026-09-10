import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { GraduationCap, Users, Loader2, Search, ChevronRight, MapPin, Layers, BookOpen, Clock, Calendar } from 'lucide-react';
import type { Class, Student, Enrollment } from '../types';

interface StudentWithEnrollment extends Student {
  enrollment: Enrollment;
}

interface MetaItem {
  id: string;
  name: string;
}

interface MetaData {
  brands: MetaItem[];
  units: MetaItem[];
  gradeLevels: MetaItem[];
  programs: MetaItem[];
}

export function Academic() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  
  const [meta, setMeta] = useState<MetaData>({ brands: [], units: [], gradeLevels: [], programs: [] });
  
  const [filters, setFilters] = useState({
    schoolYear: '2026', // default
    brandId: '',
    unitId: '',
    gradeLevelId: '',
    programId: '',
    shift: '',
    search: ''
  });

  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  
  const [students, setStudents] = useState<StudentWithEnrollment[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  // Debounce global search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 500);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Fetch classes when filters change
  useEffect(() => {
    fetchClasses();
  }, [filters.schoolYear, filters.brandId, filters.unitId, filters.gradeLevelId, filters.programId, filters.shift, debouncedSearch]);

  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const token = await user?.getIdToken();
      
      const queryParams = new URLSearchParams();
      if (filters.schoolYear) queryParams.append('schoolYear', filters.schoolYear);
      if (filters.brandId) queryParams.append('brandId', filters.brandId);
      if (filters.unitId) queryParams.append('unitId', filters.unitId);
      if (filters.gradeLevelId) queryParams.append('gradeLevelId', filters.gradeLevelId);
      if (filters.programId) queryParams.append('programId', filters.programId);
      if (filters.shift) queryParams.append('shift', filters.shift);
      if (debouncedSearch) queryParams.append('search', debouncedSearch);

      const res = await fetch(`/api/academic/classes?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        // Sort classes
        const sorted = data.classes.sort((a: Class, b: Class) => a.displayName.localeCompare(b.displayName));
        setClasses(sorted);
        if (data.meta) {
          setMeta(data.meta);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadStudents = async (classId: string) => {
    setSelectedClassId(classId);
    setLoadingStudents(true);
    setStudentSearch('');
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/academic/classes/${classId}/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStudents(data.students.sort((a: any, b: any) => a.name.localeCompare(b.name)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    // If we change a global filter, reset selection
    setSelectedClassId(null);
    if (field !== 'unitId') {
      setSelectedUnitId(null);
    }
  };

  // Grouping
  const unitsGrouping = useMemo(() => {
    const groups: Record<string, { unitName: string, classCount: number, studentCount: number, classes: Class[] }> = {};
    
    classes.forEach(cls => {
      const uid = cls.unitId;
      if (!groups[uid]) {
        groups[uid] = {
          unitName: cls.unitName || 'Desconhecida',
          classCount: 0,
          studentCount: 0,
          classes: []
        };
      }
      groups[uid].classCount++;
      groups[uid].studentCount += (cls.studentCount || 0);
      groups[uid].classes.push(cls);
    });

    return Object.entries(groups)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => a.unitName.localeCompare(b.unitName));
  }, [classes]);

  // Derived state
  const isUnitView = !selectedUnitId && !filters.unitId && !selectedClassId;
  const isClassView = (selectedUnitId || filters.unitId) && !selectedClassId;
  const isStudentView = !!selectedClassId;

  const currentUnitId = filters.unitId || selectedUnitId;
  const currentUnitName = meta.units.find(u => u.id === currentUnitId)?.name;
  
  const selectedClass = classes.find(c => c.id === selectedClassId);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    if (!studentSearch) return students;
    const lower = studentSearch.toLowerCase();
    return students.filter(s => 
      s.name.toLowerCase().includes(lower) || 
      (s.enrollment.externalStudentId && s.enrollment.externalStudentId.toLowerCase().includes(lower))
    );
  }, [students, studentSearch]);

  const shiftLabels: Record<string, string> = {
    'MORNING': 'Manhã',
    'AFTERNOON': 'Tarde',
    'FULL_TIME': 'Integral'
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Breadcrumb */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Turmas e Alunos</h1>
        
        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-gray-500 mt-2 space-x-2">
          <button onClick={() => { setSelectedUnitId(null); setSelectedClassId(null); }} className="hover:text-blue-600 font-medium">Início</button>
          
          {(filters.brandId) && (
            <>
              <ChevronRight className="w-4 h-4" />
              <span>{meta.brands.find(b => b.id === filters.brandId)?.name || 'Marca'}</span>
            </>
          )}

          {currentUnitId && (
            <>
              <ChevronRight className="w-4 h-4" />
              <button 
                onClick={() => setSelectedClassId(null)} 
                className={`hover:text-blue-600 ${!selectedClassId ? 'font-medium text-gray-900' : ''}`}
              >
                {currentUnitName || 'Unidade'}
              </button>
            </>
          )}

          {selectedClass && (
            <>
              <ChevronRight className="w-4 h-4" />
              <span className="font-medium text-gray-900">{selectedClass.displayName}</span>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
            <select 
              value={filters.schoolYear} 
              onChange={e => handleFilterChange('schoolYear', e.target.value)}
              className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>

            <select 
              value={filters.brandId} 
              onChange={e => handleFilterChange('brandId', e.target.value)}
              className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Todas as Marcas</option>
              {meta.brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <select 
              value={filters.unitId} 
              onChange={e => handleFilterChange('unitId', e.target.value)}
              className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Todas as Unidades</option>
              {meta.units.filter(u => !filters.brandId || true /* could filter units by brand here if data supports it, but keeping it simple */).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>

            <select 
              value={filters.gradeLevelId} 
              onChange={e => handleFilterChange('gradeLevelId', e.target.value)}
              className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Todas as Séries</option>
              {meta.gradeLevels.map(gl => (
                <option key={gl.id} value={gl.id}>{gl.name}</option>
              ))}
            </select>

            <select 
              value={filters.programId} 
              onChange={e => handleFilterChange('programId', e.target.value)}
              className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Todos os Programas</option>
              {meta.programs.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select 
              value={filters.shift} 
              onChange={e => handleFilterChange('shift', e.target.value)}
              className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Todos os Turnos</option>
              <option value="MORNING">Manhã</option>
              <option value="AFTERNOON">Tarde</option>
              <option value="FULL_TIME">Integral</option>
            </select>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar turma..."
                value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
                className="w-full pl-9 text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {loadingClasses ? (
        <div className="py-20 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div>
          {/* VIEW 1: UNITS LIST */}
          {isUnitView && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {unitsGrouping.length === 0 ? (
                <div className="col-span-full py-12 text-center text-gray-500">Nenhum resultado encontrado para os filtros aplicados.</div>
              ) : (
                unitsGrouping.map(ug => (
                  <button 
                    key={ug.id} 
                    onClick={() => setSelectedUnitId(ug.id)}
                    className="flex flex-col items-start bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{ug.unitName}</h3>
                    </div>
                    
                    <div className="flex space-x-6 text-sm text-gray-600">
                      <div>
                        <span className="block text-2xl font-bold text-gray-900">{ug.studentCount}</span>
                        <span>Alunos</span>
                      </div>
                      <div>
                        <span className="block text-2xl font-bold text-gray-900">{ug.classCount}</span>
                        <span>Turmas</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* VIEW 2: CLASSES LIST */}
          {isClassView && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Turmas: {currentUnitName}</h2>
                <div className="text-sm text-gray-500">
                  {classes.filter(c => c.unitId === currentUnitId).length} turmas encontradas
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {classes.filter(c => c.unitId === currentUnitId).map(cls => (
                  <button
                    key={cls.id}
                    onClick={() => loadStudents(cls.id)}
                    className="flex flex-col items-start bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-500 hover:shadow-sm transition-all text-left group"
                  >
                    <div className="flex justify-between w-full items-start mb-2">
                      <h3 className="text-lg font-bold text-[#0f172a] group-hover:text-blue-600 transition-colors">{cls.displayName}</h3>
                      <div className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full font-medium">
                        {cls.studentCount || 0} alunos
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-gray-600 mt-2">
                      <div className="flex items-center"><MapPin className="w-4 h-4 mr-1 text-gray-400" /> {cls.unitName}</div>
                      <div className="flex items-center"><Layers className="w-4 h-4 mr-1 text-gray-400" /> {cls.gradeLevelName}</div>
                      <div className="flex items-center"><BookOpen className="w-4 h-4 mr-1 text-gray-400" /> {cls.programName}</div>
                      <div className="flex items-center"><Clock className="w-4 h-4 mr-1 text-gray-400" /> {shiftLabels[cls.shift] || cls.shift}</div>
                      <div className="flex items-center"><Calendar className="w-4 h-4 mr-1 text-gray-400" /> {cls.schoolYear}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 3: STUDENTS LIST */}
          {isStudentView && selectedClass && (
            <Card className="bg-white border-gray-200 overflow-hidden">
              <CardHeader className="bg-gray-50 border-b border-gray-200 pb-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl text-[#0f172a]">{selectedClass.displayName}</CardTitle>
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-gray-600 mt-3">
                      <div className="flex items-center font-medium"><MapPin className="w-4 h-4 mr-1 text-gray-400" /> {selectedClass.unitName}</div>
                      <div className="flex items-center"><Layers className="w-4 h-4 mr-1 text-gray-400" /> {selectedClass.gradeLevelName}</div>
                      <div className="flex items-center"><BookOpen className="w-4 h-4 mr-1 text-gray-400" /> {selectedClass.programName}</div>
                      <div className="flex items-center"><Clock className="w-4 h-4 mr-1 text-gray-400" /> {shiftLabels[selectedClass.shift] || selectedClass.shift}</div>
                      <div className="flex items-center"><Calendar className="w-4 h-4 mr-1 text-gray-400" /> {selectedClass.schoolYear}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <Button onClick={() => navigate(`/academic/${selectedClass.id}/evaluate`)} className="bg-blue-700 hover:bg-blue-800 text-white shadow-sm">
                      Avaliar Turma
                    </Button>
                    <div className="bg-white px-4 py-2 rounded-md border border-gray-200 shadow-sm flex flex-col items-center justify-center min-w-[120px]">
                      <span className="text-2xl font-bold text-gray-900">{students.length}</span>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total de Alunos</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por aluno ou matrícula..."
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      className="w-full pl-9 text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {loadingStudents ? (
                  <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                ) : students.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">Nenhum aluno encontrado nesta turma.</div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">Nenhum aluno corresponde à busca.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-white">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Aluno</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Matrícula</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">E-mail Educacional</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredStudents.map((stu) => (
                          <tr key={stu.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stu.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stu.enrollment.externalStudentId}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stu.educationalEmail || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                stu.enrollment.enrollmentStatus === 'ACTIVE' ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20' : 'bg-red-50 text-red-700 ring-1 ring-red-600/20'
                              }`}>
                                {stu.enrollment.enrollmentStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
