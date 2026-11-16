import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Compass,
  Package,
  PlusCircle,
  Trees,
  Truck,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getTreeProgress } from '../../services/treeImpactService';
import { TREE_STAGE_INFO } from '../../utils/formatters';
import type { UserTreeProgress } from '../../types/domain';

const QUICK_ACCESS = [
  {
    to: '/explorar',
    title: 'Explorar',
    desc: 'Descubre productos aprobados en tu comuna',
    icon: Compass,
  },
  {
    to: '/publicar',
    title: 'Publicar',
    desc: 'Ofrece un regalo o intercambio en 5 pasos',
    icon: PlusCircle,
  },
  {
    to: '/mis-publicaciones',
    title: 'Mis publicaciones',
    desc: 'Estado de moderación y unidades disponibles',
    icon: Package,
  },
  {
    to: '/matches',
    title: 'Mis Match',
    desc: 'Solicitudes, propuestas y chat privado',
    icon: ArrowLeftRight,
  },
  {
    to: '/intercambios',
    title: 'Mis intercambios',
    desc: 'Coordinación y confirmación bilateral',
    icon: Truck,
  },
  {
    to: '/mi-arbol',
    title: 'Mi Árbol',
    desc: 'Etapa actual e insignias verificadas',
    icon: Trees,
  },
  {
    to: '/impacto',
    title: 'Impacto Circular',
    desc: 'Estadísticas de reutilización y peso',
    icon: BarChart3,
  },
  {
    to: '/educacion',
    title: 'Centro Educativo',
    desc: 'Aprendamos a Circular y desafíos',
    icon: BookOpen,
  },
  {
    to: '/perfil',
    title: 'Mi perfil',
    desc: 'Datos públicos, reputación y territorio',
    icon: User,
  },
];

export const HomeDashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [tree, setTree] = useState<UserTreeProgress | null>(null);

  useEffect(() => {
    if (!user) return;
    getTreeProgress(user.uid)
      .then(setTree)
      .catch(() => setTree(null));
  }, [user]);

  const stageInfo = TREE_STAGE_INFO[tree?.current_stage ?? 'semilla'];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-[#102C49] border border-[#244B73] text-white p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#FFA94D]">
            {profile?.communes?.name ? `${profile.communes.name} · ${profile.communes.region}` : 'Comunidad PoliCircular'}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Hola, {profile?.full_name || 'Participante'}
          </h1>
          <p className="text-sm text-slate-200 max-w-xl">
            Lo que ya no necesitas puede ser lo que alguien está buscando. Etapa actual de tu Árbol Circular:{' '}
            <strong className="text-white">{stageInfo.label}</strong> ({tree?.completed_operations ?? 0} operaciones verificadas).
          </p>
        </div>

        <div className="flex flex-wrap gap-3 shrink-0">
          <Link
            to="/publicar"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#F28C28] text-[#0B1E33] text-sm font-bold hover:bg-[#FFA242] transition-colors whitespace-nowrap"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Publicar producto</span>
          </Link>
          <Link
            to="/explorar"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#102C49] text-sm font-semibold hover:bg-slate-100 transition-colors whitespace-nowrap"
          >
            <Compass className="h-4 w-4" />
            <span>Explorar catálogo</span>
          </Link>
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-bold text-white mb-4">Accesos rápidos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUICK_ACCESS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="group rounded-2xl bg-[#102C49] border border-[#244B73] p-5 hover:border-[#FFA94D]/60 transition-colors flex items-start gap-4"
              >
                <div className="h-11 w-11 rounded-xl bg-[#0B1E33] border border-[#244B73] flex items-center justify-center text-[#FFA94D] group-hover:bg-[#F28C28] group-hover:text-[#0B1E33] transition-colors shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-sm text-white">{item.title}</h3>
                  <p className="text-xs text-slate-200 leading-relaxed">{item.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
};
