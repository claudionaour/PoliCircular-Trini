import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, ShieldAlert, UserPlus } from 'lucide-react';
import { registerUser, signInWithGoogle } from '../../services/authService';
import { listActiveCommunes, listSectorsByCommune } from '../../services/territorialService';
import { isFirebaseConfigured, translateFirebaseError } from '../../services/firebase';
import { SEED_COMMUNES, SEED_SECTORS } from '../../services/seedService';
import type { Commune, Sector } from '../../types/domain';

const registerSchema = z
  .object({
    fullName: z.string().min(3, 'Ingresa tu nombre completo.'),
    username: z
      .string()
      .min(3, 'Mínimo 3 caracteres.')
      .regex(/^[a-zA-Z0-9_.-]+$/, 'Usa solo letras, números, punto o guiones.'),
    email: z.string().email('Correo electrónico inválido.'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    communeId: z.string().min(1, 'Selecciona tu comuna.'),
    sectorId: z.string().optional(),
    accountType: z.enum(['individual', 'organization', 'educational']),
    institutionName: z.string().optional(),
    institutionDescription: z.string().optional(),
    responsiblePerson: z.string().optional(),
    institutionalCode: z.string().optional(),
    privatePhone: z.string().optional(),
    isMinorSupervised: z.boolean().optional(),
    guardianAuthorizationNote: z.string().optional(),
    acceptTerms: z.literal(true, {
      message: 'Debes aceptar los términos y reglas comunitarias.',
    }),
  })
  .superRefine((data, ctx) => {
    if (data.accountType !== 'individual') {
      if (!data.institutionName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ingresa el nombre institucional.',
          path: ['institutionName'],
        });
      }
      if (!data.responsiblePerson?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Indica la persona adulta responsable.',
          path: ['responsiblePerson'],
        });
      }
    }
    if (data.isMinorSupervised && !data.guardianAuthorizationNote?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Indica el nombre del adulto responsable o establecimiento que supervisa.',
        path: ['guardianAuthorizationNote'],
      });
    }
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);

  const {
    register,
    watch,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      accountType: 'individual',
      isMinorSupervised: false,
    },
  });

  const selectedCommuneId = watch('communeId');
  const accountType = watch('accountType');
  const isMinorSupervised = watch('isMinorSupervised');

  useEffect(() => {
    listActiveCommunes()
      .then((list) => {
        const effective =
          list.length > 0
            ? list
            : SEED_COMMUNES.filter((c) => c.is_active).map((c) => ({
                ...c,
                created_at: new Date().toISOString(),
              }));
        setCommunes(effective);
        const castro = effective.find((c) => c.name === 'Castro');
        if (castro) {
          setValue('communeId', castro.id);
        } else if (effective[0]) {
          setValue('communeId', effective[0].id);
        }
      })
      .catch(() => {
        const fallback = SEED_COMMUNES.filter((c) => c.is_active).map((c) => ({
          ...c,
          created_at: new Date().toISOString(),
        }));
        setCommunes(fallback);
        if (fallback[0]) setValue('communeId', fallback[0].id);
      });
  }, [setValue]);

  useEffect(() => {
    if (!selectedCommuneId) {
      setSectors([]);
      return;
    }
    listSectorsByCommune(selectedCommuneId, true)
      .then((list) => {
        if (list.length > 0) {
          setSectors(list);
        } else {
          setSectors(
            SEED_SECTORS.filter((s) => s.commune_id === selectedCommuneId && s.is_active).map(
              (s) => ({ ...s, created_at: new Date().toISOString() })
            )
          );
        }
      })
      .catch(() => setSectors([]));
  }, [selectedCommuneId]);

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      await registerUser({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        username: values.username,
        communeId: values.communeId,
        sectorId: values.sectorId || undefined,
        accountType: values.accountType,
        institutionName: values.institutionName,
        institutionDescription: values.institutionDescription,
        responsiblePerson: values.responsiblePerson,
        institutionalCode: values.institutionalCode,
        privatePhone: values.privatePhone,
        isMinorSupervised: values.isMinorSupervised,
        guardianAuthorizationNote: values.guardianAuthorizationNote,
      });
      setRegisteredEmail(values.email);
    } catch (err) {
      setServerError(translateFirebaseError(err));
    }
  };

  const handleGoogleSignUp = async () => {
    setServerError(null);
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
      navigate('/perfil', { replace: true });
    } catch (err) {
      setServerError(translateFirebaseError(err));
    } finally {
      setGoogleBusy(false);
    }
  };

  if (registeredEmail) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="rounded-2xl border border-[#34D399]/40 bg-[#102C49] p-8 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-[#6EE7B7] mx-auto" />
          <h1 className="font-display text-2xl font-bold text-white">
            Verifica tu correo electrónico
          </h1>
          <p className="text-sm text-slate-200 leading-relaxed">
            Enviamos un enlace de verificación a <strong className="text-white">{registeredEmail}</strong>. Una vez confirmado tu correo podrás iniciar sesión, completar tu perfil y publicar en PoliCircular.
          </p>
          <Link
            to="/iniciar-sesion"
            className="inline-block px-6 py-3 rounded-xl bg-[#F28C28] text-[#0B1E33] text-sm font-bold hover:bg-[#FFA242]"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  const isNativeAndroid = Capacitor.isNativePlatform();

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="rounded-2xl border border-[#244B73] bg-[#102C49] p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2.5 mb-2">
          <UserPlus className="h-5 w-5 text-[#FFA94D]" />
          <h1 className="font-display text-2xl font-bold text-white">Crear cuenta en PoliCircular</h1>
        </div>
        <p className="text-sm text-slate-200 mb-6">
          Tu teléfono, correo y domicilio exacto nunca se muestran públicamente. La plataforma funciona sin dinero ni compraventa.
        </p>

        {!isNativeAndroid && (
          <>
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={googleBusy || !isFirebaseConfigured}
              className="w-full mb-5 rounded-xl border border-[#3B648F] bg-white py-2.5 px-4 text-sm font-semibold text-[#102C49] hover:bg-slate-100 transition-colors flex items-center justify-center gap-2.5 min-h-[44px] disabled:opacity-50"
            >
              <span className="h-5 w-5 rounded-full bg-[#102C49] text-white text-xs font-bold flex items-center justify-center">
                G
              </span>
              <span>{googleBusy ? 'Conectando con Google...' : 'Registrarse rápido con Google'}</span>
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#244B73]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#102C49] px-3 text-slate-300">o completa el registro con correo</span>
              </div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">Nombre completo</label>
              <input
                type="text"
                {...register('fullName')}
                placeholder="Ej. Camila Soto"
                className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white placeholder:text-slate-400 px-3.5 py-2.5 text-sm focus:border-[#FFA94D] focus:outline-none"
              />
              {errors.fullName && <p className="mt-1 text-xs text-red-300">{errors.fullName.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">Nombre de usuario</label>
              <input
                type="text"
                {...register('username')}
                placeholder="camila_castro"
                className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white placeholder:text-slate-400 px-3.5 py-2.5 text-sm focus:border-[#FFA94D] focus:outline-none"
              />
              {errors.username && <p className="mt-1 text-xs text-red-300">{errors.username.message}</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">Correo electrónico</label>
              <input
                type="email"
                {...register('email')}
                placeholder="nombre@correo.cl"
                className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white placeholder:text-slate-400 px-3.5 py-2.5 text-sm focus:border-[#FFA94D] focus:outline-none"
              />
              {errors.email && <p className="mt-1 text-xs text-red-300">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">Contraseña (mín. 8 caracteres)</label>
              <input
                type="password"
                {...register('password')}
                className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white px-3.5 py-2.5 text-sm focus:border-[#FFA94D] focus:outline-none"
              />
              {errors.password && <p className="mt-1 text-xs text-red-300">{errors.password.message}</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">Comuna</label>
              <select
                {...register('communeId')}
                className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white px-3.5 py-2.5 text-sm focus:border-[#FFA94D] focus:outline-none"
              >
                <option value="">Selecciona una comuna</option>
                {communes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.region})
                  </option>
                ))}
              </select>
              {errors.communeId && <p className="mt-1 text-xs text-red-300">{errors.communeId.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">Sector aproximado</label>
              <select
                {...register('sectorId')}
                className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white px-3.5 py-2.5 text-sm focus:border-[#FFA94D] focus:outline-none"
              >
                <option value="">Opcional / Seleccionar sector</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Tipo de cuenta</label>
            <select
              {...register('accountType')}
              className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white px-3.5 py-2.5 text-sm focus:border-[#FFA94D] focus:outline-none"
            >
              <option value="individual">Individual / Familia</option>
              <option value="organization">Organización comunitaria</option>
              <option value="educational">Establecimiento educacional</option>
            </select>
          </div>

          {accountType !== 'individual' && (
            <div className="rounded-xl bg-[#0B1E33] p-4 space-y-4 border border-[#244B73]">
              <p className="text-xs font-semibold text-[#FFA94D]">
                Información institucional (los datos de contacto permanecen privados)
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    Nombre institucional
                  </label>
                  <input
                    type="text"
                    {...register('institutionName')}
                    className="w-full rounded-xl border border-[#2D557F] bg-[#102C49] text-white placeholder:text-slate-400 px-3 py-2 text-sm"
                    placeholder="Liceo / Junta de Vecinos..."
                  />
                  {errors.institutionName && (
                    <p className="mt-1 text-xs text-red-300">{errors.institutionName.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    Persona adulta responsable
                  </label>
                  <input
                    type="text"
                    {...register('responsiblePerson')}
                    className="w-full rounded-xl border border-[#2D557F] bg-[#102C49] text-white px-3 py-2 text-sm"
                  />
                  {errors.responsiblePerson && (
                    <p className="mt-1 text-xs text-red-300">{errors.responsiblePerson.message}</p>
                  )}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    Teléfono de contacto privado
                  </label>
                  <input
                    type="tel"
                    {...register('privatePhone')}
                    placeholder="+56 9 ..."
                    className="w-full rounded-xl border border-[#2D557F] bg-[#102C49] text-white placeholder:text-slate-400 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    Identificación institucional (RBD / PJ)
                  </label>
                  <input
                    type="text"
                    {...register('institutionalCode')}
                    className="w-full rounded-xl border border-[#2D557F] bg-[#102C49] text-white px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Descripción institucional
                </label>
                <textarea
                  rows={2}
                  {...register('institutionDescription')}
                  className="w-full rounded-xl border border-[#2D557F] bg-[#102C49] text-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {/* Protección de menores */}
          <div className="rounded-xl border border-[#244B73] p-4 space-y-3 bg-[#0B1E33]">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('isMinorSupervised')}
                className="mt-1 h-4 w-4 rounded border-[#2D557F] accent-[#F28C28]"
              />
              <span className="text-xs text-slate-200 leading-relaxed">
                <strong className="text-white">Cuenta escolar o supervisada de menor de edad:</strong> declaro contar con autorización de un adulto responsable o establecimiento educacional. La comunicación privada irrestricta entre adultos y menores está restringida.
              </span>
            </label>

            {isMinorSupervised && (
              <div className="pl-7 space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#FFA94D] font-medium">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Registro de supervisión obligatoria</span>
                </div>
                <input
                  type="text"
                  {...register('guardianAuthorizationNote')}
                  placeholder="Nombre del apoderado/docente responsable y curso o establecimiento"
                  className="w-full rounded-xl border border-[#2D557F] bg-[#102C49] text-white placeholder:text-slate-400 px-3 py-2 text-sm"
                />
                {errors.guardianAuthorizationNote && (
                  <p className="text-xs text-red-300">{errors.guardianAuthorizationNote.message}</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('acceptTerms')}
                className="mt-1 h-4 w-4 rounded border-[#2D557F] accent-[#F28C28]"
              />
              <span className="text-xs text-slate-200">
                Acepto los{' '}
                <Link to="/reglas-comunitarias" className="text-[#FFA94D] font-semibold hover:underline">
                  Términos de uso, Política de privacidad y Reglas comunitarias
                </Link>{' '}
                (sin compraventa ni dinero).
              </span>
            </label>
            {errors.acceptTerms && (
              <p className="mt-1 text-xs text-red-300">{errors.acceptTerms.message}</p>
            )}
          </div>

          {serverError && (
            <div className="rounded-xl bg-red-950/70 border border-red-400/40 p-3 text-xs text-red-200">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !isFirebaseConfigured}
            className="w-full rounded-xl bg-[#F28C28] py-3 text-sm font-bold text-[#0B1E33] hover:bg-[#FFA242] transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {isSubmitting ? 'Registrando cuenta...' : 'Crear cuenta en PoliCircular'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-300">
          ¿Ya tienes cuenta?{' '}
          <Link to="/iniciar-sesion" className="font-semibold text-[#FFA94D] hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
};
