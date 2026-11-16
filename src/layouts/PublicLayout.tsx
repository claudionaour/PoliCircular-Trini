import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { useAuth } from '../context/AuthContext';

export const PublicLayout: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1E33] text-white">
      <header className="sticky top-0 z-30 bg-[#102C49]/95 backdrop-blur-md border-b border-[#244B73]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <Link to="/" className="shrink-0 focus-visible:outline-2 focus-visible:outline-[#FFA94D] rounded-lg">
            <BrandLogo size="md" />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-200">
            <Link to="/explorar" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Explorar
            </Link>
            <Link to="/impacto" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Impacto Circular
            </Link>
            <Link to="/educacion" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Centro Educativo
            </Link>
            <Link to="/reglas-comunitarias" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Reglas y Privacidad
            </Link>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <Link
                to="/inicio"
                className="px-4 py-2 rounded-xl bg-white text-[#102C49] text-sm font-semibold hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
              >
                Mi espacio
              </Link>
            ) : (
              <Link
                to="/iniciar-sesion"
                className="px-4 py-2 rounded-xl bg-white text-[#102C49] text-sm font-semibold hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
              >
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-[#244B73] bg-[#081626] py-10 text-sm text-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <BrandLogo size="sm" />
            <p className="text-xs text-slate-200 max-w-xl leading-relaxed">
              Plataforma comunitaria y educativa de economía circular sin uso de dinero. Nacida en Castro, Archipiélago de Chiloé, Chile. Creada por Trinidad Naour Cheuquepil, Maithe Caro, Byron Care, Alumnos del Liceo Politécnico de Castro. Profesora: Katty Arenas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-200">
            <Link to="/explorar" className="hover:text-[#FFA94D] transition-colors">
              Explorar catálogo
            </Link>
            <Link to="/educacion" className="hover:text-[#FFA94D] transition-colors">
              Aprendamos a Circular
            </Link>
            <Link to="/impacto" className="hover:text-[#FFA94D] transition-colors">
              Impacto Circular
            </Link>
            <Link to="/reglas-comunitarias" className="hover:text-[#FFA94D] transition-colors">
              Términos, privacidad y reglas
            </Link>
          </div>
        </div>
      </footer>

      <OfflineIndicator />
    </div>
  );
};
