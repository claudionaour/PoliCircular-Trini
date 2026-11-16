import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminDashboardStats, type AdminDashboardStats } from '../../services/adminService';
import { listImpactRecords } from '../../services/treeImpactService';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [impactWeight, setImpactWeight] = useState({ measured: 0, estimated: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAdminDashboardStats(), listImpactRecords()])
      .then(([s, records]) => {
        setStats(s);
        let measured = 0;
        let estimated = 0;
        for (const r of records) {
          if (r.weight_type === 'measured') measured += Number(r.weight_kg);
          else estimated += Number(r.weight_kg);
        }
        setImpactWeight({ measured, estimated });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return <div className="p-6 text-sm text-slate-300">Cargando métricas administrativas...</div>;
  }

  const cards = [
    { label: 'Usuarios registrados', value: stats.usersCount, link: '/admin/usuarios' },
    { label: 'Publicaciones pendientes', value: stats.pendingProducts, link: '/admin/moderacion' },
    { label: 'Publicaciones aprobadas', value: stats.approvedProducts, link: '/admin/moderacion' },
    { label: 'Publicaciones rechazadas', value: stats.rejectedProducts, link: '/admin/moderacion' },
    { label: 'Solicitudes registradas', value: stats.requestsCount },
    { label: 'Match generados', value: stats.matchesCount },
    { label: 'Operaciones finalizadas', value: stats.completedExchanges },
    { label: 'Denuncias abiertas', value: stats.openReports, link: '/admin/denuncias' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Panel de Administración</h1>
        <p className="text-sm text-slate-300">
          Supervisión operativa, moderación previa obligatoria, territorio e indicadores ambientales.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-[#102C49] border border-[#244B73] p-5 space-y-2">
            <span className="text-xs text-slate-300 block">{c.label}</span>
            <span className="font-mono text-2xl font-bold text-white tabular-nums block">
              {c.value}
            </span>
            {c.link && (
              <Link to={c.link} className="inline-block text-xs font-semibold text-[#FFA94D] hover:underline">
                Gestionar
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[#102C49] border border-[#244B73] p-5">
          <p className="text-xs font-semibold text-[#6EE7B7]">PESO MEDIDO ACUMULADO</p>
          <p className="font-mono text-2xl font-bold text-white tabular-nums mt-1">
            {impactWeight.measured.toFixed(2)} kg
          </p>
        </div>
        <div className="rounded-2xl bg-[#102C49] border border-[#244B73] p-5">
          <p className="text-xs font-semibold text-[#FFA94D]">PESO ESTIMADO REFERENCIAL</p>
          <p className="font-mono text-2xl font-bold text-white tabular-nums mt-1">
            {impactWeight.estimated.toFixed(2)} kg
          </p>
        </div>
      </div>
    </div>
  );
};
