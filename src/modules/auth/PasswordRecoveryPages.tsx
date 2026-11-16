import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import {
  confirmPasswordResetWithCode,
  sendPasswordRecovery,
  updateUserPassword,
} from '../../services/authService';
import { isFirebaseConfigured, translateFirebaseError } from '../../services/firebase';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendPasswordRecovery(email);
      setSent(true);
    } catch (err) {
      setError(translateFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-2xl border border-[#244B73] bg-[#102C49] p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="h-5 w-5 text-[#FFA94D]" />
          <h1 className="font-display text-xl font-bold text-white">Recuperar contraseña</h1>
        </div>
        {sent ? (
          <div className="space-y-4 mt-4">
            <p className="text-sm text-slate-200">
              Si existe una cuenta asociada a <strong className="text-white">{email}</strong>, recibirás un enlace para restablecer tu contraseña.
            </p>
            <Link to="/iniciar-sesion" className="inline-block text-sm font-semibold text-[#FFA94D] hover:underline">
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">Correo electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white px-3.5 py-2.5 text-sm focus:border-[#FFA94D] focus:outline-none"
              />
            </div>
            {error && <p className="text-xs text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={loading || !isFirebaseConfigured}
              className="w-full rounded-xl bg-[#F28C28] py-2.5 text-sm font-bold text-[#0B1E33] hover:bg-[#FFA242] disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode');
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Ingresa al menos 8 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (oobCode) {
        await confirmPasswordResetWithCode(oobCode, password);
      } else {
        await updateUserPassword(password);
      }
      setDone(true);
    } catch (err) {
      setError(translateFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-2xl border border-[#244B73] bg-[#102C49] p-6 sm:p-8 shadow-sm">
        <h1 className="font-display text-xl font-bold text-white">Nueva contraseña</h1>
        {done ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-[#6EE7B7]">Contraseña actualizada correctamente.</p>
            <Link to="/iniciar-sesion" className="inline-block px-4 py-2 rounded-xl bg-[#F28C28] text-[#0B1E33] text-sm font-bold">
              Ir a PoliCircular
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white placeholder:text-slate-400 px-3.5 py-2.5 text-sm"
            />
            {error && <p className="text-xs text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#F28C28] py-2.5 text-sm font-bold text-[#0B1E33] hover:bg-[#FFA242]"
            >
              {loading ? 'Guardando...' : 'Actualizar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
