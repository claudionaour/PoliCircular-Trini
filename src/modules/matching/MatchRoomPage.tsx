import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  CheckCheck,
  Flag,
  Send,
  ShieldAlert,
  Truck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMatchDetail } from '../../services/matchingService';
import {
  listMessages,
  markConversationMessagesRead,
  sendMessage,
  subscribeToConversationMessages,
  toggleConversationBlock,
} from '../../services/chatService';
import { cancelExchangeAgreementRpc } from '../../services/exchangeService';
import { ReportModal } from '../../components/ReportModal';
import { EXCHANGE_STATUS_LABELS, formatChileDateTime } from '../../utils/formatters';
import type { Conversation, MatchRecord, Message } from '../../types/domain';

export const MatchRoomPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { user } = useAuth();

  const [match, setMatch] = useState<MatchRecord | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadData = useCallback(async () => {
    if (!matchId || !user) return;
    setLoading(true);
    try {
      const m = await getMatchDetail(matchId);
      setMatch(m);
      const conv = m?.conversations?.[0] ?? null;
      setConversation(conv);
      if (conv) {
        const msgs = await listMessages(conv.id);
        setMessages(msgs);
        await markConversationMessagesRead(conv.id, user.uid);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible abrir la conversación.');
    } finally {
      setLoading(false);
    }
  }, [matchId, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!conversation || !user) return;
    const channel = subscribeToConversationMessages(
      conversation.id,
      (incoming) => {
        // Handler idempotente ordenado cronológicamente
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
        if (incoming.sender_id !== user.uid) {
          markConversationMessagesRead(conversation.id, user.uid).catch(() => {});
        }
      },
      (updated) => {
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      }
    );

    return () => {
      channel.unsubscribe();
    };
  }, [conversation, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation || !user || !draft.trim() || conversation.is_blocked) return;
    setSending(true);
    setError(null);
    try {
      const sent = await sendMessage(conversation.id, user.uid, draft);
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el mensaje.');
    } finally {
      setSending(false);
    }
  };

  const handleBlockToggle = async () => {
    if (!conversation || !user) return;
    const nextBlock = !conversation.is_blocked;
    await toggleConversationBlock(conversation.id, user.uid, nextBlock);
    setConversation({ ...conversation, is_blocked: nextBlock, blocked_by: nextBlock ? user.uid : null });
  };

  const handleCancelAgreement = async () => {
    const exchange = match?.exchanges?.[0];
    if (!exchange) return;
    try {
      await cancelExchangeAgreementRpc(exchange.id, 'Cancelado desde el chat del Match');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cancelar el acuerdo.');
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-slate-200">Cargando chat privado...</div>;
  }

  if (!match || !conversation) {
    return (
      <div className="rounded-2xl bg-[#102C49] border border-[#244B73] p-8 text-center">
        <p className="font-display font-bold text-white">Conversación no encontrada o no autorizada</p>
        <Link to="/matches" className="mt-3 inline-block text-sm font-semibold text-[#FFA94D]">
          Volver a Mis Match
        </Link>
      </div>
    );
  }

  const other = match.owner_id === user?.uid ? match.requester : match.owner;
  const exchange = match.exchanges?.[0];
  const involvesMinor = Boolean(match.owner?.is_minor_supervised || match.requester?.is_minor_supervised);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/matches"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-200 hover:text-[#FFA94D]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Mis Match</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/intercambios"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F28C28] text-[#0B1E33] text-xs font-bold hover:bg-[#FFA242]"
          >
            <Truck className="h-4 w-4" />
            <span>
              Coordinar entrega ({exchange ? EXCHANGE_STATUS_LABELS[exchange.status] : 'Pendiente'})
            </span>
          </Link>
          <button
            type="button"
            onClick={handleBlockToggle}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-[#3B648F] bg-[#102C49] text-xs font-semibold text-white hover:bg-[#163B61]"
          >
            <Ban className="h-3.5 w-3.5" />
            <span>{conversation.is_blocked ? 'Desbloquear' : 'Bloquear'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowReport(true)}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-[#3B648F] bg-[#102C49] text-xs font-semibold text-white hover:text-red-300"
          >
            <Flag className="h-3.5 w-3.5" />
            <span>Denunciar</span>
          </button>
          {exchange && exchange.status !== 'completed' && exchange.status !== 'cancelled' && (
            <button
              type="button"
              onClick={handleCancelAgreement}
              className="px-3 py-2 rounded-xl border border-red-400/40 bg-red-950/70 text-xs font-semibold text-red-200"
            >
              Cancelar acuerdo
            </button>
          )}
        </div>
      </div>

      {involvesMinor && (
        <div className="rounded-xl bg-[#2A2015] border border-[#F28C28]/40 p-3 text-xs text-[#FDE68A] flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-[#FFA94D] shrink-0" />
          <span>
            Participa una cuenta escolar o supervisada. Acuerda entregas únicamente en establecimientos educacionales o puntos públicos comunitarios junto a un adulto responsable.
          </span>
        </div>
      )}

      <div className="rounded-2xl bg-[#102C49] border border-[#244B73] overflow-hidden flex flex-col h-[62vh] min-h-[420px]">
        <div className="px-5 py-3.5 border-b border-[#244B73] bg-[#081626] flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-base text-white">
              Chat privado con {other?.full_name}
            </h1>
            <p className="text-xs text-slate-300">
              Producto: {match.target_product?.title} ({match.quantity_reserved} u.)
            </p>
          </div>
          <span className="text-xs font-semibold text-[#6EE7B7]">Tiempo real</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0B1E33]">
          {messages.length === 0 ? (
            <p className="text-center text-xs text-slate-300 my-8">
              Inicia la conversación para coordinar fecha, horario y punto de encuentro público sin exponer domicilios particulares.
            </p>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === user?.uid;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      isMine
                        ? 'bg-[#F28C28] text-[#0B1E33] font-medium'
                        : 'bg-[#102C49] text-white border border-[#244B73]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-300">
                    <span>{formatChileDateTime(msg.created_at)}</span>
                    {isMine && (
                      <CheckCheck
                        className={`h-3.5 w-3.5 ${msg.is_read ? 'text-[#FFA94D]' : 'text-slate-400'}`}
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-950/70 border-t border-red-400/40 text-xs text-red-200">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSend}
          className="p-3 border-t border-[#244B73] bg-[#081626] flex items-center gap-2"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={conversation.is_blocked || sending}
            placeholder={
              conversation.is_blocked
                ? 'Esta conversación está bloqueada.'
                : 'Escribe un mensaje para coordinar...'
            }
            className="flex-1 rounded-xl border border-[#2D557F] bg-[#102C49] text-white placeholder:text-slate-400 px-3.5 py-2.5 text-sm focus:border-[#FFA94D] focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={conversation.is_blocked || sending || !draft.trim()}
            className="px-4 py-2.5 rounded-xl bg-[#F28C28] text-[#0B1E33] text-sm font-bold hover:bg-[#FFA242] disabled:opacity-50 inline-flex items-center gap-1.5 min-h-[44px]"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </form>
      </div>

      {showReport && (
        <ReportModal
          targetType="conversation"
          targetId={conversation.id}
          targetTitle={`Conversación con ${other?.full_name}`}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};
