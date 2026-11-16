import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  BookOpen,
  Compass,
  Home,
  Package,
  PlusCircle,
  Settings,
  Shield,
  Trees,
  Truck,
  User,
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const SIDEBAR_ITEMS = [
  { to: '/inicio', label: 'Inicio', icon: Home },
  { to: '/explorar', label: 'Explorar', icon: Compass },
  { to: '/publicar', label: 'Publicar', icon: PlusCircle },
  { to: '/mis-publicaciones', label: 'Mis publicaciones', icon: Package },
  { to: '/matches', label: 'Mis Match', icon: ArrowLeftRight },
  { to: '/intercambios', label: 'Mis intercambios', icon: Truck },
  { to: '/mi-arbol', label: 'Mi Árbol', icon: Trees },
  { to: '/impacto', label: 'Impacto Circular', icon: BarChart3 },
  { to: '/educacion', label: 'Centro Educativo', icon: BookOpen },
  { to: '/notificaciones', label: 'Notificaciones', icon: Bell },
  { to: '/perfil', label: 'Mi perfil', icon: User },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
];

const MOBILE_BOTTOM_TABS = [
  { to: '/inicio', label: 'Inicio', icon: Home },
  { to: '/explorar', label: 'Explorar', icon: Compass },
  { to: '/publicar', label: 'Publicar', icon: PlusCircle },
  { to: '/matches', label: 'Match', icon: ArrowLeftRight },
  { to: '/perfil', label: 'Perfil', icon: User },
];

export const AppLayout: React.FC = () => {
  const { isModerator } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <div className="min-h-screen bg-[#0B1E33] text-white flex flex-col md:flex-row">
      {/* Navegación lateral escritorio */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-[#102C49] border-r border-[#244B73] z-30">
        <div className="h-16 px-5 flex items-center border-b border-[#244B73]">
          <Link to="/inicio">
            <BrandLogo size="md" />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#F28C28] text-[#0B1E33] font-bold'
                      : 'text-slate-200 hover:bg-[#163B61] hover:text-white'
                  }`
                }
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {item.to === '/notificaciones' && unreadCount > 0 && (
                  <span className="font-mono text-xs font-bold tabular-nums px-1.5 py-0.5 rounded-md bg-white text-[#102C49]">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}

          {isModerator && (
            <div className="pt-4 mt-4 border-t border-[#244B73]">
              <Link
                to="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0B1E33] border border-[#244B73] hover:bg-[#163B61] transition-colors"
              >
                <Shield className="h-4 w-4 text-[#FFA94D]" />
                <span>Panel Administrativo</span>
              </Link>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-[#244B73] space-y-3">
          <PWAInstallButton />
        </div>
      </aside>

      {/* Cabecera móvil compacta (<= 48px) */}
      <header className="md:hidden sticky top-0 z-30 h-12 bg-[#102C49]/95 backdrop-blur-md border-b border-[#244B73] px-4 flex items-center justify-between">
        <Link to="/inicio" className="shrink-0">
          <BrandLogo size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          <PWAInstallButton compact />
          <Link
            to="/notificaciones"
            className="relative min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-white hover:bg-[#163B61]"
            aria-label="Notificaciones"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-4 min-w-[16px] px-1 rounded-full bg-[#F28C28] text-[10px] font-bold text-[#0B1E33] flex items-center justify-center tabular-nums">
                {unreadCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 md:pl-64 pb-20 md:pb-8 flex flex-col">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
          <Outlet />
        </div>
        <footer className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4 pb-2 border-t border-[#244B73]/60 text-xs text-slate-300">
          Nacida en Castro, Archipiélago de Chiloé, Chile. Creada por Trinidad Naour Cheuquepil, Maithe Caro, Byron Care, Alumnos del Liceo Politécnico de Castro. Profesora: Katty Arenas.
        </footer>
      </main>

      {/* Barra inferior móvil (5 accesos principales; administración fuera del menú normal) */}
      <nav
        aria-label="Navegación principal móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#102C49]/95 backdrop-blur-md border-t border-[#244B73] pb-safe"
      >
        <div className="grid grid-cols-5 h-14 items-center">
          {MOBILE_BOTTOM_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center min-h-[44px] text-[11px] font-medium transition-colors ${
                    isActive ? 'text-[#FFA94D] font-bold' : 'text-slate-300 hover:text-white'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                <span className="mt-0.5 leading-none">{tab.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <OfflineIndicator />
    </div>
  );
};
