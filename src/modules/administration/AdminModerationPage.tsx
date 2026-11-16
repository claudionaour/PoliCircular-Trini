import React, { useCallback, useEffect, useState } from 'react';
import { Ban, Check, X } from 'lucide-react';
import { listModerationQueue, moderateProductRpc } from '../../services/adminService';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import {
  CONDITION_LABELS,
  formatChileDate,
  MODALITY_LABELS,
  PRODUCT_STATUS_LABELS,
} from '../../utils/formatters';
import type { Product } from '../../types/domain';

export const AdminModerationPage: React.FC = () => {
  const [filter, setFilter] = useState<string>('pending');
  const [items, setItems] = useState<Product[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listModerationQueue(filter || undefined);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando cola de moderación.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = async (productId: string, action: 'approve' | 'reject' | 'suspend') => {
    setError(null);
    const reason = reasons[productId] || '';
    if ((action === 'reject' || action === 'suspend') && reason.trim().length < 5) {
      setError('Debes ingresar un motivo claro (mínimo 5 caracteres) al rechazar o suspender.');
      return;
    }
    try {
      await moderateProductRpc(productId, action, reason);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo ejecutar la moderación.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Moderación de publicaciones
          </h1>
          <p className="text-sm text-slate-300">
            Ninguna publicación es visible en Explorar hasta ser aprobada por moderación en el backend.
          </p>
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-[#2D557F] bg-[#0B1E33] px-3.5 py-2 text-xs font-semibold text-white focus:border-[#FFA94D] focus:outline-none"
        >
          <option value="pending">Pendientes de revisión</option>
          <option value="approved">Aprobadas</option>
          <option value="rejected">Rechazadas</option>
          <option value="suspended">Suspendidas</option>
          <option value="">Todas</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl bg-red-950/70 border border-red-400/40 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-44 rounded-2xl bg-[#102C49] border border-[#244B73] animate-pulse" />
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-[#102C49] border border-[#244B73] p-8 text-center text-sm text-slate-300">
          No hay publicaciones en este filtro.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl bg-[#102C49] border border-[#244B73] p-5 space-y-4"
            >
              <div className="flex flex-col lg:flex-row gap-5">
                {/* Fotografías */}
                <div className="flex gap-2 overflow-x-auto lg:w-72 shrink-0">
                  {(p.product_images ?? []).length === 0 ? (
                    <div className="h-32 w-40 rounded-xl bg-[#081626] border border-[#244B73] flex items-center justify-center text-xs text-slate-400">
                      Sin fotos
                    </div>
                  ) : (
                    p.product_images?.map((img) => (
                      <div key={img.id} className="h-32 w-32 rounded-xl overflow-hidden border border-[#244B73] shrink-0">
                        <ImageWithFallback src={img.public_url} alt={p.title} className="w-full h-full object-cover" />
                      </div>
                    ))
                  )}
                </div>

                {/* Metadata & Descripción */}
                <div className="flex-1 space-y-2">
                  <div className="text-xs text-slate-300">
                    <span className="font-semibold text-white">
                      {PRODUCT_STATUS_LABELS[p.status]}
                    </span>
                    <span aria-hidden="true"> · </span>
                    <span>{MODALITY_LABELS[p.modality]}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{p.categories?.name}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{CONDITION_LABELS[p.condition]}</span>
                  </div>
                  <h2 className="font-display font-bold text-lg text-white">{p.title}</h2>
                  <p className="text-sm text-slate-200">{p.description}</p>
                  {p.desired_exchange_items && (
                    <p className="text-xs text-[#FFA94D]">
                      Busca a cambio: {p.desired_exchange_items}
                    </p>
                  )}
                  <p className="text-xs text-slate-300">
                    Oferente: {p.profiles?.full_name} (@{p.profiles?.username}) · {p.communes?.name}
                    {p.sectors ? ` · ${p.sectors.name}` : ''} · {formatChileDate(p.created_at)}
                  </p>
                </div>
              </div>

              {/* Acciones RPC */}
              <div className="pt-3 border-t border-[#244B73] flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={reasons[p.id] ?? ''}
                  onChange={(e) => setReasons((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  placeholder="Observación o motivo (obligatorio si rechazas o suspendes)"
                  className="flex-1 rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white placeholder:text-slate-400 px-3 py-2 text-xs focus:border-[#FFA94D] focus:outline-none"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAction(p.id, 'approve')}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#1E7E48] text-white text-xs font-semibold hover:bg-[#239454]"
                  >
                    <Check className="h-4 w-4" />
                    <span>Aprobar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(p.id, 'reject')}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#F28C28] text-[#0B1E33] text-xs font-bold hover:bg-[#FFA242]"
                  >
                    <X className="h-4 w-4" />
                    <span>Rechazar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(p.id, 'suspend')}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-red-700 text-white text-xs font-semibold hover:bg-red-800"
                  >
                    <Ban className="h-4 w-4" />
                    <span>Suspender</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
