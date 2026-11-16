import React, { useCallback, useEffect, useState } from 'react';
import {
  listEducationalInstitutions,
  saveEducationalInstitution,
} from '../../services/adminService';
import { listAllCommunes } from '../../services/territorialService';
import { INSTITUTION_BADGE_LABELS } from '../../utils/formatters';
import type { Commune, EducationalInstitution, InstitutionBadge } from '../../types/domain';

export const AdminEducationPage: React.FC = () => {
  const [institutions, setInstitutions] = useState<EducationalInstitution[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [communeId, setCommuneId] = useState('');
  const [responsible, setResponsible] = useState('');
  const [badge, setBadge] = useState<InstitutionBadge>('escuela_circular');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [insts, comms] = await Promise.all([
      listEducationalInstitutions(),
      listAllCommunes(),
    ]);
    setInstitutions(insts);
    setCommunes(comms);
    if (!communeId && comms[0]) setCommuneId(comms[0].id);
  }, [communeId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await saveEducationalInstitution({
        name,
        institution_code: code,
        commune_id: communeId || null,
        responsible_name: responsible,
        badge_level: badge,
        is_verified: true,
      });
      setName('');
      setCode('');
      setResponsible('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error registrando establecimiento.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Gestión educativa</h1>
        <p className="text-sm text-slate-300">
          Registra establecimientos educacionales, asigna distintivos circulares y valida responsables institucionales.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-950/70 border border-red-400/40 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="rounded-2xl bg-[#102C49] border border-[#244B73] p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del establecimiento"
          className="rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white placeholder:text-slate-400 px-3 py-2 text-xs focus:border-[#FFA94D] focus:outline-none"
        />
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="RBD o código institucional"
          className="rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white placeholder:text-slate-400 px-3 py-2 text-xs focus:border-[#FFA94D] focus:outline-none"
        />
        <input
          type="text"
          required
          value={responsible}
          onChange={(e) => setResponsible(e.target.value)}
          placeholder="Docente / responsable adulto"
          className="rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white placeholder:text-slate-400 px-3 py-2 text-xs focus:border-[#FFA94D] focus:outline-none"
        />
        <select
          value={communeId}
          onChange={(e) => setCommuneId(e.target.value)}
          className="rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white px-3 py-2 text-xs focus:border-[#FFA94D] focus:outline-none"
        >
          {communes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={badge}
          onChange={(e) => setBadge(e.target.value as InstitutionBadge)}
          className="rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white px-3 py-2 text-xs focus:border-[#FFA94D] focus:outline-none"
        >
          {Object.entries(INSTITUTION_BADGE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-xl bg-[#F28C28] text-[#0B1E33] text-xs font-bold py-2 px-4 hover:bg-[#FFA242]"
        >
          Registrar establecimiento
        </button>
      </form>

      <div className="rounded-2xl bg-[#102C49] border border-[#244B73] divide-y divide-[#244B73]">
        {institutions.length === 0 ? (
          <p className="p-6 text-xs text-slate-300">Sin establecimientos registrados aún.</p>
        ) : (
          institutions.map((inst) => (
            <div key={inst.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <h2 className="font-display font-bold text-sm text-white">{inst.name}</h2>
                <p className="text-slate-300">
                  Responsable: {inst.responsible_name} · {inst.communes?.name || '—'} ·{' '}
                  {inst.institution_code || 'Sin código'}
                </p>
              </div>
              <span className="font-semibold text-[#6EE7B7]">
                {INSTITUTION_BADGE_LABELS[inst.badge_level]}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
