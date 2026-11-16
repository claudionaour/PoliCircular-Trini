import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogIn, MailCheck } from 'lucide-react';
import {
  resendVerificationEmail,
  signInUser,
  signInWithGoogle,
} from '../../services/authService';
import { isFirebaseConfigured, translateFirebaseError } from '../../services/firebase';

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isNativeAndroid = Capacitor.isNativePlatform();
  const [serverError, setServerError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationResent, setVerificationResent] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const fromPath = (location.state as { from?: string } | null)?.from || '/inicio';

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    setNeedsVerification(false);
    setVerificationResent(false);
    try {
      await signInUser(values.email, values.password);
      navigate(fromPath, { replace: true });
    } catch (err) {
      const msg = translateFirebaseError(err);
      setServerError(msg);
      if (msg.includes('verificado')) {
        setNeedsVerification(true);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setServerError(null);
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
      navigate(fromPath, { replace: true });
    } catch (err) {
      setServerError(translateFirebaseError(err));
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await resendVerificationEmail();
      setVerificationResent(true);
    } catch (err) {
      setServerError(translateFirebaseError(err));
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-2xl border border-[#244B73] bg-[#102C49] p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2.5 mb-2">
          <LogIn className="h-5 w-5 text-[#FFA94D]" />
          <h1 className="font-display text-2xl font-bold text-white">Iniciar sesión</h1>
        </div>
        <p className="text-sm text-slate-200 mb-6">
          Ingresa con tu correo verificado{isNativeAndroid ? '' : ' o tu cuenta Google'} para publicar, proponer intercambios y revisar tu Árbol Circular.
        </p>

        {!isNativeAndroid && (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleBusy || !isFirebaseConfigured}
              className="w-full mb-5 rounded-xl border border-[#3B648F] bg-white py-2.5 px-4 text-sm font-semibold text-[#102C49] hover:bg-slate-100 transition-colors flex items-center justify-center gap-2.5 min-h-[44px] disabled:opacity-50"
            >
              <span className="h-5 w-5 rounded-full bg-[#102C49] text-white text-xs font-bold flex items-center justify-center">
                G
              </span>
              <span>{googleBusy ? 'Conectando con Google...' : 'Continuar con Google'}</span>
            </button>

            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#244B73]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#102C49] px-3 text-slate-300">o con correo y contraseña</span>
              </div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              autoComplete="email"
              {...register('email')}
              className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white placeholder:text-slate-400 px-3.5 py-2.5 text-sm focus:border-[#FFA94D] focus:outline-none"
              placeholder="nombre@correo.cl"
            />
            {errors.email && <p className="mt-1 text-xs text-red-300">{errors.email.message}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-200">Contraseña</label>
              <Link to="/recuperar-contrasena" className="text-xs font-medium text-[#FFA94D] hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              type="password"
              autoComplete="current-password"
              {...register('password')}
              className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white px-3.5 py-2.5 text-sm focus:border-[#FFA94D] focus:outline-none"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-300">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <div className="rounded-xl bg-red-950/70 border border-red-400/40 p-3 text-xs text-red-200 space-y-2">
              <p>{serverError}</p>
              {needsVerification && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  className="inline-flex items-center gap-1.5 font-semibold text-[#FFA94D] hover:underline"
                >
                  <MailCheck className="h-3.5 w-3.5" />
                  <span>Reenviar correo de verificación</span>
                </button>
              )}
              {verificationResent && (
                <p className="text-[#6EE7B7] font-medium">
                  Correo de verificación reenviado correctamente.
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !isFirebaseConfigured}
            className="w-full rounded-xl bg-[#F28C28] py-3 text-sm font-bold text-[#0B1E33] hover:bg-[#FFA242] transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-300">
          ¿Aún no tienes cuenta?{' '}
          <Link to="/registro" className="font-semibold text-[#FFA94D] hover:underline">
            Crear cuenta gratuita
          </Link>
        </p>
      </div>
    </div>
  );
};
