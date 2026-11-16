import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, MessageSquare, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  acceptMatchRequestRpc,
  listMatchRequests,
  listUserInterests,
  listUserMatches,
  updateMatchRequestStatus,
} from '../../services/matchingService';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import { formatChileDate, MODALITY_LABELS } from '../../utils/formatters';
import type { MatchRecord, MatchRequest } from '../../types/domain';

type Tab = 'matches' | 'received' | 'sent' | 'favorites';

export const MatchesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('matches');
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [m, reqs, ints] = await Promise.all([
        listUserMatches(user.uid),
        listMatchRequests(user.uid),
        listUserInterests(user.uid),
      ]);
      setMatches(m);
      setRequests(reqs);
      setFavorites(ints.filter((i: any) => i.decision === 'favorite' || i.decision === 'interested'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando solicitudes y Match.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleAccept = async (reqId: string) => {
    setError(null);
    try {
      const matchId = await acceptMatchRequestRpc(reqId);
      navigate(`/matches/${matchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo aceptar la solicitud.');
    }
  };

  const handleRejectOrCancel = async (reqId: string, status: 'rejected' | 'cancelled') => {
    setError(null);
    try {
      await updateMatchRequestStatus(reqId, status);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar la solicitud.');
    }
  };

  const received = requests.filter((r) => r.owner_id === user?.uid && r.status === 'pending');
  const sent = requests.filter((r) => r.requester_id === user?.uid);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Mis Match y Solicitudes</h1>
        <p className="text-sm text-slate-200">
          Un interés guardado no es un Match. El Match nace cuando el propietario acepta la solicitud y reserva las unidades.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 p-1 bg-[#102C49] border border-[#244B73] rounded-xl w-fit">
        {[
          { id: 'matches', label: `Match (${matches.length})` },
          { id: 'received', label: `Recibidas (${received.length})` },
          { id: 'sent', label: `Enviadas (${sent.length})` },
          { id: 'favorites', label: `Intereses y Favoritos (${favorites.length})` },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id as Tab)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === item.id ? 'bg-[#F28C28] text-[#0B1E33] font-bold' : 'text-slate-200 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl bg-red-950/70 border border-red-400/40 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-40 rounded-2xl bg-[#102C49] border border-[#244B73] animate-pulse" />
      ) : tab === 'matches' ? (
        matches.length === 0 ? (
          <div className="rounded-2xl bg-[#102C49] border border-[#244B73] p-8 text-center text-sm text-slate-200">
            Aún no tienes Match confirmados. Explora productos o revisa tus solicitudes recibidas.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {matches.map((m) => {
              const other = m.owner_id === user?.uid ? m.requester : m.owner;
              const img =
                m.target_product?.product_images?.find((i) => i.is_primary)?.public_url ||
                m.target_product?.product_images?.[0]?.public_url;
              return (
                <div
                  key={m.id}
                  className="rounded-2xl bg-[#102C49] border border-[#244B73] p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-[#081626] shrink-0">
                      <ImageWithFallback src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#FFA94D]">
                        {MODALITY_LABELS[m.modality]} · {m.quantity_reserved} u.
                      </p>
                      <h3 className="font-display font-bold text-sm text-white truncate">
                        {m.target_product?.title}
                      </h3>
                      <p className="text-xs text-slate-300 truncate">
                        Con {other?.full_name} · {formatChileDate(m.created_at)}
                      </p>
                    </div>
                  </div>

                  <Link
                    to={`/matches/${m.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-[#102C49] text-xs font-semibold hover:bg-slate-100 shrink-0"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Abrir chat</span>
                  </Link>
                </div>
              );
            })}
          </div>
        )
      ) : tab === 'received' ? (
        received.length === 0 ? (
          <div className="rounded-2xl bg-[#102C49] border border-[#244B73] p-8 text-center text-sm text-slate-200">
            No tienes solicitudes pendientes por responder.
          </div>
        ) : (
          <div className="space-y-4">
            {received.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl bg-[#102C49] border border-[#244B73] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="text-xs text-slate-300">
                    <span className="font-semibold text-[#FFA94D]">{MODALITY_LABELS[req.modality]}</span>
                    <span> · Solicitado por </span>
                    <strong className="text-white">{req.requester?.full_name}</strong>
                    <span> · {req.requested_quantity} unidad(es)</span>
                  </div>
                  <h3 className="font-display font-bold text-base text-white">
                    {req.target_product?.title}
                  </h3>
                  {req.offered_product && (
                    <p className="text-xs text-[#6EE7B7] font-medium">
                      Ofrece a cambio: {req.offered_product.title}
                    </p>
                  )}
                  {req.message && <p className="text-xs text-slate-200">“{req.message}”</p>}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRejectOrCancel(req.id, 'rejected')}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-[#3B648F] bg-[#0B1E33] text-xs font-semibold text-slate-200 hover:border-red-400/50 hover:text-red-200"
                  >
                    <X className="h-4 w-4" />
                    <span>Rechazar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAccept(req.id)}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#1E7E48] text-white text-xs font-semibold hover:bg-[#239454]"
                  >
                    <Check className="h-4 w-4" />
                    <span>Aceptar y generar Match</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : tab === 'sent' ? (
        sent.length === 0 ? (
          <div className="rounded-2xl bg-[#102C49] border border-[#244B73] p-8 text-center text-sm text-slate-200">
            Aún no has enviado solicitudes.
          </div>
        ) : (
          <div className="space-y-3">
            {sent.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl bg-[#102C49] border border-[#244B73] p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-xs text-slate-300">
                    {MODALITY_LABELS[req.modality]} · Estado: <strong className="text-white">{req.status}</strong>
                  </p>
                  <p className="font-display font-bold text-sm text-white">
                    {req.target_product?.title}
                  </p>
                </div>
                {req.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => handleRejectOrCancel(req.id, 'cancelled')}
                    className="text-xs font-semibold text-red-300 hover:underline"
                  >
                    Cancelar solicitud
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      ) : favorites.length === 0 ? (
        <div className="rounded-2xl bg-[#102C49] border border-[#244B73] p-8 text-center text-sm text-slate-200">
          No tienes productos guardados como favoritos o de interés.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((item) => (
            <Link
              key={item.id}
              to={`/producto/${item.product_id}`}
              className="rounded-2xl bg-[#102C49] border border-[#244B73] p-4 hover:border-[#FFA94D]/60 transition-colors flex items-center gap-3"
            >
              <div className="h-14 w-14 rounded-xl overflow-hidden bg-[#081626] shrink-0">
                <ImageWithFallback
                  src={item.products?.product_images?.[0]?.public_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[#FFA94D]">
                  {item.decision === 'favorite' ? 'Favorito' : 'Me interesa'}
                </p>
                <p className="font-display font-bold text-sm text-white truncate">
                  {item.products?.title}
                </p>
                <p className="text-xs text-slate-300">{item.products?.communes?.name}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
