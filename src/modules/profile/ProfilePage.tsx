import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Shield, Star, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchPrivateContact,
  updateOwnProfile,
  uploadAvatarImage,
} from '../../services/authService';
import { listActiveCommunes, listSectorsByCommune } from '../../services/territorialService';
import { listUserReviews } from '../../services/exchangeService';
import { validateAndOptimizeImage } from '../../utils/imageOptimizer';
import { ACCOUNT_TYPE_LABELS, formatChileDate } from '../../utils/formatters';
import type { Commune, Review, Sector } from '../../types/domain';
import { ImageWithFallback } from '../../components/ImageWithFallback';

export const ProfilePage: React.FC = () => {
  const { user, profile, isModerator, refreshProfile, signOut } = useAuth();
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [communeId, setCommuneId] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [privatePhone, setPrivatePhone] = useState('');
  const [privateEmail, setPrivateEmail] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [institutionDesc, setInstitutionDesc] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    listActiveCommunes().then(setCommunes).catch(() => setCommunes([]));
  }, []);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || '');
    setBio(profile.bio || '');
    setCommuneId(profile.commune_id || '');
    setSectorId(profile.sector_id || '');
    setInstitutionName(profile.institution_name || '');
    setInstitutionDesc(profile.institution_description || '');
    setResponsiblePerson(profile.responsible_person || '');
  }, [profile]);

  useEffect(() => {
    if (!communeId) {
      setSectors([]);
      return;
    }
    listSectorsByCommune(communeId, true).then(setSectors).catch(() => setSectors([]));
  }, [communeId]);

  useEffect(() => {
    if (!user) return;
    fetchPrivateContact(user.uid)
      .then((c) => {
        setPrivatePhone(c?.private_phone || '');
        setPrivateEmail(c?.private_email || user.email || '');
      })
      .catch(() => {});

    listUserReviews(user.uid).then(setReviews).catch(() => setReviews([]));
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    setMessage(null);
    try {
      const optimized = await validateAndOptimizeImage(file);
      const publicUrl = await uploadAvatarImage(user.uid, optimized.file);
      await updateOwnProfile(user.uid, { avatar_url: publicUrl });
      await refreshProfile();
      setMessage({ type: 'ok', text: 'Fotografía de perfil actualizada.' });
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'No fue posible subir la fotografía.',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateOwnProfile(
        user.uid,
        {
          full_name: fullName.trim(),
          bio: bio.trim() || null,
          commune_id: communeId || null,
          sector_id: sectorId || null,
          institution_name: institutionName.trim() || null,
          institution_description: institutionDesc.trim() || null,
          responsible_person: responsiblePerson.trim() || null,
        },
        privatePhone.trim() || null
      );
      await refreshProfile();
      setMessage({ type: 'ok', text: 'Perfil guardado correctamente.' });
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error al actualizar perfil.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Mi perfil</h1>
          <p className="text-sm text-slate-200">
            @{profile.username} · {ACCOUNT_TYPE_LABELS[profile.account_type]}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isModerator && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-[#102C49] text-xs font-semibold hover:bg-slate-100"
            >
              <Shield className="h-4 w-4 text-[#D97719]" />
              <span>Ir a Administración</span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => signOut()}
            className="px-4 py-2 rounded-xl border border-[#3B648F] bg-[#102C49] text-xs font-semibold text-white hover:bg-[#163B61]"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Tarjeta resumen pública */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl bg-[#102C49] border border-[#244B73] p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 rounded-2xl overflow-hidden bg-[#081626] border border-[#244B73] shrink-0">
                <ImageWithFallback
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-full h-full object-cover"
                />
                <label className="absolute bottom-1 right-1 h-7 w-7 rounded-lg bg-[#F28C28] text-[#0B1E33] flex items-center justify-center cursor-pointer hover:bg-[#FFA242] transition-colors">
                  <Camera className="h-3.5 w-3.5" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarChange}
                    disabled={uploadingAvatar}
                    className="sr-only"
                  />
                </label>
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-white">{profile.full_name}</h2>
                <p className="text-xs text-slate-300">
                  {profile.communes?.name || 'Sin comuna'}
                  {profile.sectors?.name ? ` · ${profile.sectors.name}` : ''}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-white tabular-nums">
                  <Star className="h-4 w-4 text-[#FFA94D] fill-[#FFA94D]" />
                  <span>
                    {Number(profile.reputation_avg).toFixed(1)} ({profile.reputation_count} evaluaciones)
                  </span>
                </div>
              </div>
            </div>

            {profile.is_minor_supervised && (
              <div className="rounded-xl bg-[#143D29] border border-[#34D399]/35 p-3 text-xs text-[#6EE7B7] flex items-start gap-2">
                <UserCheck className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Cuenta supervisada: {profile.guardian_authorization_note || 'Autorización registrada'}.
                </span>
              </div>
            )}

            <p className="text-xs text-slate-300">
              Tu correo ({privateEmail}) y teléfono son privados y nunca aparecen en tus publicaciones.
            </p>
          </div>

          <div className="rounded-2xl bg-[#102C49] border border-[#244B73] p-6 space-y-3">
            <h3 className="font-display font-bold text-sm text-white">
              Evaluaciones recibidas ({reviews.length})
            </h3>
            {reviews.length === 0 ? (
              <p className="text-xs text-slate-300">
                Aún no tienes evaluaciones. Se habilitan después de completar un intercambio confirmado por ambas partes.
              </p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {reviews.map((rev) => (
                  <div key={rev.id} className="border-t border-[#244B73] pt-3 first:border-t-0 first:pt-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">
                        {rev.reviewer?.full_name || 'Participante'}
                      </span>
                      <span className="font-mono font-semibold text-[#FFA94D] tabular-nums">
                        {Number(rev.overall_rating).toFixed(1)} / 5.0
                      </span>
                    </div>
                    {rev.comment && <p className="mt-1 text-xs text-slate-200">{rev.comment}</p>}
                    <p className="mt-1 text-[11px] text-slate-300">{formatChileDate(rev.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Formulario edición */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-8 rounded-2xl bg-[#102C49] border border-[#244B73] p-6 space-y-5"
        >
          <h2 className="font-display text-lg font-bold text-white">Editar información</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">Nombre completo</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white px-3.5 py-2.5 text-sm focus:border-[#FFA94D] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Teléfono privado (solo uso de seguridad)
              </label>
              <input
                type="tel"
                value={privatePhone}
                onChange={(e) => setPrivatePhone(e.target.value)}
                placeholder="+56 9 ..."
                className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white placeholder:text-slate-400 px-3.5 py-2.5 text-sm focus:border-[#FFA94D] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">Comuna</label>
              <select
                value={communeId}
                onChange={(e) => {
                  setCommuneId(e.target.value);
                  setSectorId('');
                }}
                className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white px-3.5 py-2.5 text-sm focus:border-[#FFA94D] focus:outline-none"
              >
                <option value="">Selecciona comuna</option>
                {communes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.region})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">Sector aproximado</label>
              <select
                value={sectorId}
                onChange={(e) => setSectorId(e.target.value)}
                className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white px-3.5 py-2.5 text-sm focus:border-[#FFA94D] focus:outline-none"
              >
                <option value="">Opcional / Comuna general</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Presentación breve (visible en tu perfil)
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Cuéntale a la comunidad qué tipo de objetos sueles reutilizar o reparar..."
              className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white placeholder:text-slate-400 px-3.5 py-2.5 text-sm focus:border-[#FFA94D] focus:outline-none"
            />
          </div>

          {profile.account_type !== 'individual' && (
            <div className="rounded-xl bg-[#0B1E33] p-4 space-y-4 border border-[#244B73]">
              <p className="text-xs font-semibold text-[#FFA94D]">Datos institucionales</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    Nombre institucional
                  </label>
                  <input
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    className="w-full rounded-xl border border-[#2D557F] bg-[#102C49] text-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    Persona responsable
                  </label>
                  <input
                    type="text"
                    value={responsiblePerson}
                    onChange={(e) => setResponsiblePerson(e.target.value)}
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
                  value={institutionDesc}
                  onChange={(e) => setInstitutionDesc(e.target.value)}
                  className="w-full rounded-xl border border-[#2D557F] bg-[#102C49] text-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {message && (
            <div
              className={`rounded-xl p-3 text-xs ${
                message.type === 'ok'
                  ? 'bg-[#143D29] border border-[#34D399]/35 text-[#6EE7B7]'
                  : 'bg-red-950/70 text-red-200 border border-red-400/40'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#F28C28] text-[#0B1E33] text-sm font-bold hover:bg-[#FFA242] disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
