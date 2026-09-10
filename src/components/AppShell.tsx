import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LayoutDashboard, Users, LogOut, Menu, X, Upload, GraduationCap, ClipboardList } from 'lucide-react';
import { Button } from './ui/Button';

export function AppShell() {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const links = [
    { to: '/', label: 'Início', icon: LayoutDashboard, exact: true },
    { to: '/academic', label: 'Turmas e Alunos', icon: GraduationCap },
    ...(profile?.role === 'MASTER' ? [
      { to: '/matrices', label: 'Matrizes', icon: ClipboardList },
      { to: '/imports', label: 'Importações', icon: Upload },
      { to: '/usuarios', label: 'Usuários', icon: Users }
    ] : [])
  ];

  const toggleMobile = () => setMobileOpen(!mobileOpen);

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Mobile Sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden" onClick={toggleMobile} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:flex lg:flex-col ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
          <span className="text-lg font-semibold tracking-tight text-[#0f172a]">Central de Relatórios Pedagógicos</span>
          <button className="lg:hidden text-gray-500 hover:text-gray-900" onClick={toggleMobile}>
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.exact}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#0f172a] text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <link.icon className="w-5 h-5 mr-3" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center px-3 mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{profile?.name}</p>
              <p className="text-xs text-gray-500 truncate">{profile?.role === 'MASTER' ? 'Mestre' : 'Coordenação'}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={signOut}>
            <LogOut className="w-5 h-5 mr-3" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
          <span className="text-lg font-semibold text-[#0f172a]">Central de Relatórios Pedagógicos</span>
          <button className="text-gray-500 hover:text-gray-900" onClick={toggleMobile}>
            <Menu size={24} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
