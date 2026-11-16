import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  MapPin,
  MessageSquare,
  Star,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  cancelExchangeAgreementRpc,
  confirmExchangeDeliveryRpc,
  listMySubmittedReviewExchangeIds,
  listUserExchanges,
  markExchangeDispute,
  proposeExchangeDelivery,
} from '../../services/exchangeService';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { OsmSectorMap } from '../../components/OsmSectorMap';
import { ReviewFormModal } from '../reviews/ReviewFormModal';
import { ReportModal } from '../../components/ReportModal';
import { EXCHANGE_STATUS_LABELS, formatChileDate } from '../../utils/formatters';
import type { ExchangeRecord } from '../../types/domain';

export const ExchangesPage: React.FC = () => {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();

  const [exchanges, setExchanges] = useState<ExchangeRecord[]>([]);
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCoordId, setActiveCoordId] = useState<string | null>(null);
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('16:00 - 17:00');
  const [meetingLabel, setMeetingLabel] = useState('Plaza de Armas de Castro (punto público)');
  const [meetingLat, setMeetingLat] = useState<number | null>(-42.4822);
  const [meetingLng, setMeetingLng] = useState<number | null>(-73.7644);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [measuredWeight, setMeasuredWeight] = useState('');
  const [confirmNotes, setConfirmNotes] = useState('');

  const [reviewTarget, setReviewTarget] = useState<{ exchangeId: string; name: string } | null>(null);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [list, revIds] = await Promise.all([
        listUserExchanges(user.uid),
        listMySubmittedReviewExchangeIds(user.uid),
      ]);
      setExchanges(list);
      setReviewedIds(revIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando entregas.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveCoordination = async (exchangeId: string, agreed: boolean) => {
    if (!user) return;
    setError(null);
    try {
      await proposeExchangeDelivery({
        exchangeId,
        proposedBy: user.uid,
        proposedDate,
        proposedTimeSlot: proposedTime,
        meetingPointLabel: meetingLabel,
        meetingPointLat: meetingLat,
        meetingPointLng: meetingLng,
        agreed,
      });
      setActiveCoordId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar la coordinación.');
    }
  };

  const handleConfirmDelivery = async (exchangeId: string) => {
    if (!isOnline) {
      setError('Se requiere conexión activa con el servidor para confirmar una entrega.');
      return;
    }
    setError(null);
    try {
      const parsedWeight = measuredWeight.trim() ? Number(measuredWeight) : null;
      await confirmExchangeDeliveryRpc({
        exchangeId,
        notes: confirmNotes,
        measuredWeightKg: parsedWeight && parsedWeight > 0 ? parsedWeight : null,
      });
      setConfirmingId(null);
      setMeasuredWeight('');
      setConfirmNotes('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible registrar tu confirmación.');
    }
  };

  const handleCancel = async (exchangeId: string) => {
    setError(null);
    try {
      await cancelExchangeAgreementRpc(exchangeId, 'Cancelado por participante durante coordinación');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cancelar.');
    }
  };

  const handleDispute = async (exchangeId: string) => {
    setError(null);
    try {
      await markExchangeDispute(exchangeId);
      setReportTargetId(exchangeId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reportar disputa.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">
          Mis intercambios y coordinación de entregas
        </h1>
        <p className="text-sm text-slate-200">
          La operación se finaliza únicamente cuando ambas partes confirman la entrega. Nunca se publican domicilios particulares.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-950/70 border border-red-400/40 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-44 rounded-2xl bg-[#102C49] border border-[#244B73] animate-pulse" />
      ) : exchanges.length === 0 ? (
        <div className="rounded-2xl bg-[#102C49] border border-[#244B73] p-8 text-center space-y-3">
          <p className="font-display font-bold text-white">Sin entregas en curso</p>
          <p className="text-sm text-slate-200">
            Cuando aceptes o te acepten una solicitud en Mis Match, podrás coordinar la entrega aquí.
          </p>
          <Link to="/matches" className="inline-block px-4 py-2 rounded-xl bg-[#F28C28] text-[#0B1E33] text-xs font-bold">
            Ir a Mis Match
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {exchanges.map((ex) => {
            const match = ex.matches;
            const other = match?.owner_id === user?.uid ? match?.requester : match?.owner;
            const confirmations = ex.exchange_confirmations ?? [];
            const iConfirmed = confirmations.some((c) => c.user_id === user?.uid);
            const otherConfirmed = confirmations.some((c) => c.user_id !== user?.uid);
            const alreadyReviewed = reviewedIds.includes(ex.id);
            const isClosed = ex.status === 'completed' || ex.status === 'cancelled';

            return (
              <article
                key={ex.id}
                className="rounded-2xl bg-[#102C49] border border-[#244B73] p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-300">
                      <span
                        className={`font-semibold ${
                          ex.status === 'completed'
                            ? 'text-[#6EE7B7]'
                            : ex.status === 'cancelled' || ex.status === 'disputed'
                              ? 'text-red-300'
                              : 'text-[#FFA94D]'
                        }`}
                      >
                        {EXCHANGE_STATUS_LABELS[ex.status]}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span>Contraparte: {other?.full_name || 'Participante'}</span>
                    </div>
                    <h2 className="font-display text-lg font-bold text-white">
                      {match?.target_product?.title}
                    </h2>
                    {match?.offered_product && (
                      <p className="text-xs text-[#6EE7B7]">
                        Intercambio con: {match.offered_product.title}
                      </p>
                    )}
                  </div>

                  {match && (
                    <Link
                      to={`/matches/${match.id}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#3B648F] bg-[#0B1E33] text-xs font-semibold text-white hover:bg-[#163B61] self-start"
                    >
                      <MessageSquare className="h-4 w-4 text-[#FFA94D]" />
                      <span>Abrir chat</span>
                    </Link>
                  )}
                </div>

                {/* Resumen de coordinación actual */}
                <div className="rounded-xl bg-[#0B1E33] border border-[#244B73] p-4 grid sm:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-[#FFA94D] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-300 block">Fecha y horario</span>
                      <strong className="text-white">
                        {ex.proposed_date ? `${formatChileDate(ex.proposed_date)} · ${ex.proposed_time_slot || ''}` : 'Por definir'}
                      </strong>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-[#FFA94D] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-300 block">Punto de encuentro público</span>
                      <strong className="text-white">
                        {ex.meeting_point_label || 'Sin definir'}
                      </strong>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-300 block">Confirmación bilateral</span>
                    <strong className="text-white">
                      Tu confirmación: {iConfirmed ? 'Sí' : 'Pendiente'} · Otra parte: {otherConfirmed ? 'Sí' : 'Pendiente'}
                    </strong>
                  </div>
                </div>

                {/* Formulario de coordinación */}
                {activeCoordId === ex.id && !isClosed && (
                  <div className="rounded-xl border border-[#244B73] bg-[#0B1E33] p-4 space-y-4">
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-200 mb-1">Fecha</label>
                        <input
                          type="date"
                          value={proposedDate}
                          onChange={(e) => setProposedDate(e.target.value)}
                          className="w-full rounded-xl border border-[#2D557F] bg-[#102C49] text-white px-3 py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-200 mb-1">Horario</label>
                        <input
                          type="text"
                          value={proposedTime}
                          onChange={(e) => setProposedTime(e.target.value)}
                          placeholder="16:00 - 17:00"
                          className="w-full rounded-xl border border-[#2D557F] bg-[#102C49] text-white placeholder:text-slate-400 px-3 py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-200 mb-1">
                          Punto de encuentro público
                        </label>
                        <input
                          type="text"
                          value={meetingLabel}
                          onChange={(e) => setMeetingLabel(e.target.value)}
                          placeholder="Plaza, liceo o sede comunitaria"
                          className="w-full rounded-xl border border-[#2D557F] bg-[#102C49] text-white placeholder:text-slate-400 px-3 py-2 text-xs"
                        />
                      </div>
                    </div>

                    <OsmSectorMap
                      latitude={meetingLat}
                      longitude={meetingLng}
                      interactive
                      onSelectPoint={(lat, lng) => {
                        setMeetingLat(lat);
                        setMeetingLng(lng);
                      }}
                      label={`Zona referencial seleccionada (${meetingLabel})`}
                      heightClass="h-48"
                    />

                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveCoordId(null)}
                        className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                      >
                        Cerrar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveCoordination(ex.id, false)}
                        className="px-4 py-2 rounded-xl border border-[#3B648F] bg-[#102C49] text-xs font-semibold text-white hover:bg-[#163B61]"
                      >
                        Enviar propuesta
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveCoordination(ex.id, true)}
                        className="px-4 py-2 rounded-xl bg-[#F28C28] text-[#0B1E33] text-xs font-bold hover:bg-[#FFA242]"
                      >
                        Marcar entrega acordada
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirmación bilateral */}
                {confirmingId === ex.id && !isClosed && (
                  <div className="rounded-xl border border-[#34D399]/40 bg-[#143D29] p-4 space-y-3">
                    <h3 className="font-display font-bold text-sm text-white">
                      Confirmar entrega realizada
                    </h3>
                    <p className="text-xs text-slate-200">
                      Si pesaron realmente los objetos entregados en una balanza, pueden registrar el peso medido real. Si lo dejas vacío, el sistema calculará un peso estimado de referencia.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-200 mb-1">
                          Peso medido real en kg (solo si fue pesado)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={measuredWeight}
                          onChange={(e) => setMeasuredWeight(e.target.value)}
                          placeholder="Opcional (ej. 2.5)"
                          className="w-full rounded-xl border border-[#34D399]/40 bg-[#0B1E33] text-white placeholder:text-slate-400 px-3 py-2 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-200 mb-1">
                          Notas de entrega (opcional)
                        </label>
                        <input
                          type="text"
                          value={confirmNotes}
                          onChange={(e) => setConfirmNotes(e.target.value)}
                          placeholder="Entregado en buenas condiciones"
                          className="w-full rounded-xl border border-[#34D399]/40 bg-[#0B1E33] text-white placeholder:text-slate-400 px-3 py-2 text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmDelivery(ex.id)}
                        disabled={!isOnline}
                        className="px-4 py-2 rounded-xl bg-[#34D399] text-[#0B1E33] text-xs font-bold hover:bg-[#6EE7B7] disabled:opacity-50"
                      >
                        Registrar mi confirmación
                      </button>
                    </div>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#244B73]">
                  {!isClosed && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setProposedDate(ex.proposed_date || '');
                          setProposedTime(ex.proposed_time_slot || '16:00 - 17:00');
                          setMeetingLabel(ex.meeting_point_label || 'Plaza de Armas de Castro (punto público)');
                          setActiveCoordId(activeCoordId === ex.id ? null : ex.id);
                        }}
                        className="px-3.5 py-2 rounded-xl border border-[#3B648F] bg-[#0B1E33] text-xs font-semibold text-white hover:bg-[#163B61]"
                      >
                        Proponer fecha / lugar
                      </button>

                      {!iConfirmed && (
                        <button
                          type="button"
                          onClick={() => setConfirmingId(confirmingId === ex.id ? null : ex.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E7E48] text-white text-xs font-semibold hover:bg-[#239454]"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Confirmar entrega</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCancel(ex.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-red-300"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Cancelar acuerdo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDispute(ex.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-[#FDE68A] hover:bg-[#2A2015]"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <span>Informar incumplimiento</span>
                      </button>
                    </>
                  )}

                  {ex.status === 'completed' && !alreadyReviewed && (
                    <button
                      type="button"
                      onClick={() =>
                        setReviewTarget({
                          exchangeId: ex.id,
                          name: other?.full_name || 'Participante',
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F28C28] text-[#0B1E33] text-xs font-bold hover:bg-[#FFA242]"
                    >
                      <Star className="h-4 w-4" />
                      <span>Evaluar intercambio</span>
                    </button>
                  )}

                  {ex.status === 'completed' && alreadyReviewed && (
                    <span className="text-xs font-medium text-[#6EE7B7]">
                      Evaluación enviada · Operación contabilizada en tu Árbol Circular
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {reviewTarget && (
        <ReviewFormModal
          exchangeId={reviewTarget.exchangeId}
          targetName={reviewTarget.name}
          onClose={() => setReviewTarget(null)}
          onSuccess={() => {
            setReviewTarget(null);
            loadData();
          }}
        />
      )}

      {reportTargetId && (
        <ReportModal
          targetType="exchange"
          targetId={reportTargetId}
          targetTitle="Incumplimiento o conflicto en entrega"
          onClose={() => setReportTargetId(null)}
        />
      )}
    </div>
  );
};
