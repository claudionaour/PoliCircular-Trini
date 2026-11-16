import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { formatChileDateTime } from '../../utils/formatters';

export const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Notificaciones</h1>
          <p className="text-sm text-slate-300 tabular-nums">
            {unreadCount} sin leer · Historial de eventos en tiempo real
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllAsRead()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#3B648F] bg-[#0B1E33] text-xs font-semibold text-white hover:bg-[#163B61]"
          >
            <CheckCheck className="h-4 w-4 text-[#6EE7B7]" />
            <span>Marcar todas como leídas</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="h-32 rounded-2xl bg-[#102C49] border border-[#244B73] animate-pulse" />
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl bg-[#102C49] border border-[#244B73] p-8 text-center space-y-2">
          <Bell className="h-8 w-8 text-slate-400 mx-auto" />
          <p className="font-display font-bold text-sm text-white">Sin notificaciones aún</p>
          <p className="text-xs text-slate-300">
            Recibirás avisos cuando aprueben tus publicaciones, recibas solicitudes, mensajes o logros.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#102C49] border border-[#244B73] divide-y divide-[#244B73] overflow-hidden">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex items-start justify-between gap-4 ${
                n.is_read ? 'bg-[#102C49]' : 'bg-[#183B5E]'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-bold text-sm text-white">{n.title}</h2>
                  {!n.is_read && (
                    <span className="text-[11px] font-semibold text-[#FFA94D]">Nueva</span>
                  )}
                </div>
                <p className="text-xs text-slate-200">{n.body}</p>
                <p className="text-[11px] text-slate-300">{formatChileDateTime(n.created_at)}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {n.link_path && (
                  <Link
                    to={n.link_path}
                    onClick={() => !n.is_read && markAsRead(n.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#F28C28] text-[#0B1E33] text-xs font-bold hover:bg-[#FFA242]"
                  >
                    Ver
                  </Link>
                )}
                {!n.is_read && (
                  <button
                    type="button"
                    onClick={() => markAsRead(n.id)}
                    className="text-xs font-medium text-slate-300 hover:text-white"
                  >
                    Leída
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
