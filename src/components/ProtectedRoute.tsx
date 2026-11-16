import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { MailCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { resendVerificationEmail } from '../services/authService';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, profile, isEmailVerified, reloadAuthUser, signOut } = useAuth();
  const location = useLocation();
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-sm text-slate-200">Verificando sesión...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/iniciar-sesion" state={{ from: location.pathname }} replace />;
  }

  if (!isEmailVerified) {
    return (
      <div className="max-w-lg mx-auto my-12 p-7 rounded-3xl border border-[#F28C28]/50 bg-[#102C49] text-white space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-[#2A2015] border border-[#F28C28]/40 text-[#FFA94D] flex items-center justify-center">
            <MailCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">Verifica tu correo electrónico</h2>
            <p className="text-xs text-[#FFA94D]">{user.email}</p>
          </div>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">
          Para proteger a la comunidad de PoliCircular, debes confirmar tu correo mediante el enlace
          enviado a tu bandeja de entrada antes de publicar, coordinar entregas o enviar mensajes.
        </p>
        {resent && (
          <div className="rounded-xl bg-[#143D29] border border-[#34D399]/35 p-3 text-xs text-[#6EE7B7] font-medium">
            Enviamos un nuevo correo de verificación. Revisa tu bandeja o spam.
          </div>
        )}
        <div className="flex flex-wrap gap-2.5 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await reloadAuthUser();
              } finally {
                setBusy(false);
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1E7E48] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#239454] disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            Ya verifiqué mi correo
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await resendVerificationEmail();
                setResent(true);
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-xl border border-[#3B648F] bg-[#0B1E33] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#163B61] disabled:opacity-60"
          >
            Reenviar correo
          </button>
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  if (profile?.is_suspended) {
    return (
      <div className="max-w-lg mx-auto my-12 p-6 rounded-2xl border border-red-400/40 bg-red-950/70 text-red-100">
        <h2 className="font-display text-lg font-bold">Cuenta suspendida temporalmente</h2>
        <p className="mt-2 text-sm">
          {profile.suspension_reason ||
            'Tu cuenta se encuentra suspendida mientras la moderación revisa un reporte.'}
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isModerator, isEmailVerified } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-sm text-slate-200">Verificando permisos administrativos...</div>
      </div>
    );
  }

  if (!user || !isEmailVerified || !isModerator) {
    return <Navigate to="/inicio" replace />;
  }

  return <>{children}</>;
};
