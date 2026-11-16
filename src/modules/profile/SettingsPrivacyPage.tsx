import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Lock, LogOut, Smartphone, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { deleteOwnAccount } from '../../services/authService';
import { PWAInstallButton } from '../../components/PWAInstallButton';

export const SettingsPrivacyPage: React.FC = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteOwnAccount();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible dar de baja la cuenta.');
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Configuración y privacidad</h1>
        <p className="text-sm text-slate-200">
          Gestiona la seguridad de tu cuenta, instalación móvil y preferencias de privacidad.
        </p>
      </div>

      <section className="rounded-2xl bg-[#102C49] border border-[#244B73] p-6 space-y-3">
        <div className="flex items-center gap-2 font-display font-bold text-white">
          <Lock className="h-5 w-5 text-[#6EE7B7]" />
          <h2>Protección de datos y ubicación</h2>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">
          Tus datos privados (correo, teléfono y domicilio exacto) no se comparten en el catálogo público. Los mapas solo muestran un radio aproximado de tu sector y las conversaciones privadas están protegidas por Reglas de Seguridad de Firebase.
        </p>
        <Link to="/reglas-comunitarias" className="inline-block text-xs font-semibold text-[#FFA94D] hover:underline">
          Consultar términos de uso, privacidad y reglas comunitarias
        </Link>
      </section>

      <section className="rounded-2xl bg-[#102C49] border border-[#244B73] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-display font-bold text-white">
            <Smartphone className="h-5 w-5 text-[#FFA94D]" />
            <h2>Aplicación Android (APK) y PWA</h2>
          </div>
          <p className="text-xs text-slate-200">
            Descarga el archivo APK para Android o instala PoliCircular como aplicación en tu teléfono o escritorio.
          </p>
        </div>
        <PWAInstallButton />
      </section>

      <section className="rounded-2xl bg-[#102C49] border border-[#244B73] p-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-sm text-white">Sesión activa</h2>
          <p className="text-xs text-slate-200">Cierra sesión en este dispositivo de forma segura.</p>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#3B648F] bg-[#0B1E33] text-sm font-semibold text-white hover:bg-[#163B61]"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar sesión</span>
        </button>
      </section>

      <section className="rounded-2xl bg-[#102C49] border border-red-400/40 p-6 space-y-4">
        <div className="flex items-center gap-2 font-display font-bold text-red-200">
          <AlertTriangle className="h-5 w-5" />
          <h2>Eliminación de cuenta</h2>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed">
          Al eliminar tu cuenta, tus datos de contacto privado se borran, tus publicaciones activas se archivan y tu perfil público se anonimiza conservando el historial íntegro de operaciones ambientales ya finalizadas.
        </p>

        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-400/50 bg-red-950/60 text-red-200 text-xs font-semibold hover:bg-red-900/60"
          >
            <Trash2 className="h-4 w-4" />
            <span>Solicitar eliminación de cuenta</span>
          </button>
        ) : (
          <div className="rounded-xl bg-red-950/70 border border-red-400/40 p-4 space-y-3">
            <p className="text-xs font-semibold text-red-100">
              ¿Confirmas que deseas dar de baja tu cuenta de PoliCircular? Esta acción no se puede deshacer.
            </p>
            {error && <p className="text-xs text-red-200">{error}</p>}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Procesando...' : 'Sí, eliminar mi cuenta'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-xl bg-[#0B1E33] border border-[#3B648F] text-xs font-semibold text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
