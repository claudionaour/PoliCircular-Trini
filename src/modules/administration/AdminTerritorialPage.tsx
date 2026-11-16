import React, { useCallback, useEffect, useState } from 'react';
import { listAllCommunes, listSectorsByCommune } from '../../services/territorialService';
import { saveCommuneAdmin, saveSectorAdmin } from '../../services/adminService';
import { ensureInitialTerritorialSeed } from '../../services/seedService';
import type { Commune, Sector } from '../../types/domain';

export const AdminTerritorialPage: React.FC = () => {
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [selectedCommuneId, setSelectedCommuneId] = useState('');
  const [sectors, setSectors] = useState<Sector[]>([]);

  const [newCommuneName, setNewCommuneName] = useState('');
  const [newCommuneRegion, setNewCommuneRegion] = useState('Los Lagos');
  const [newSectorName, setNewSectorName] = useState('');
  const [newSectorDesc, setNewSectorDesc] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadCommunes = useCallback(async () => {
    const list = await listAllCommunes();
    setCommunes(list);
    if (!selectedCommuneId && list[0]) {
      setSelectedCommuneId(list[0].id);
    }
  }, [selectedCommuneId]);

  useEffect(() => {
    loadCommunes().catch(() => {});
  }, [loadCommunes]);

  const loadSectors = useCallback(async () => {
    if (!selectedCommuneId) return;
    const list = await listSectorsByCommune(selectedCommuneId, false);
    setSectors(list);
  }, [selectedCommuneId]);

  useEffect(() => {
    loadSectors().catch(() => {});
  }, [loadSectors]);

  const handleToggleCommune = async (c: Commune) => {
    setError(null);
    try {
      await saveCommuneAdmin({ ...c, is_active: !c.is_active });
      await loadCommunes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No autorizado para editar comunas.');
    }
  };

  const handleAddCommune = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommuneName.trim()) return;
    setError(null);
    try {
      await saveCommuneAdmin({
        name: newCommuneName,
        region: newCommuneRegion,
        is_active: true,
      });
      setNewCommuneName('');
      await loadCommunes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando comuna.');
    }
  };

  const handleAddSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommuneId || !newSectorName.trim()) return;
    setError(null);
    try {
      await saveSectorAdmin({
        commune_id: selectedCommuneId,
        name: newSectorName,
        description: newSectorDesc,
        is_active: true,
      });
      setNewSectorName('');
      setNewSectorDesc('');
      await loadSectors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando sector.');
    }
  };

  const handleToggleSector = async (s: Sector) => {
    setError(null);
    try {
      await saveSectorAdmin({
        id: s.id,
        commune_id: s.commune_id,
        name: s.name,
        description: s.description || undefined,
        approx_lat: s.approx_lat,
        approx_lng: s.approx_lng,
        is_active: !s.is_active,
      });
      await loadSectors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando sector.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Gestión territorial</h1>
          <p className="text-sm text-slate-300">
            Administra comunas activas de Chiloé y Chile y define sectores validados localmente sin inventar límites geográficos.
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            setError(null);
            try {
              await ensureInitialTerritorialSeed(true);
              await loadCommunes();
              await loadSectors();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'No fue posible cargar el catálogo base.');
            }
          }}
          className="px-4 py-2 rounded-xl bg-[#1E7E48] text-white text-xs font-semibold hover:bg-[#239454] self-start"
        >
          Sincronizar semilla Castro y categorías
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-950/70 border border-red-400/40 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Comunas */}
        <section className="rounded-2xl bg-[#102C49] border border-[#244B73] p-6 space-y-4">
          <h2 className="font-display font-bold text-base text-white">Comunas</h2>
          <form onSubmit={handleAddCommune} className="flex gap-2">
            <input
              type="text"
              value={newCommuneName}
              onChange={(e) => setNewCommuneName(e.target.value)}
              placeholder="Nueva comuna..."
              className="flex-1 rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white placeholder:text-slate-400 px-3 py-2 text-xs focus:border-[#FFA94D] focus:outline-none"
            />
            <input
              type="text"
              value={newCommuneRegion}
              onChange={(e) => setNewCommuneRegion(e.target.value)}
              placeholder="Región"
              className="w-32 rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white placeholder:text-slate-400 px-3 py-2 text-xs focus:border-[#FFA94D] focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-white text-[#102C49] text-xs font-semibold hover:bg-slate-100"
            >
              Agregar
            </button>
          </form>

          <div className="divide-y divide-[#244B73] max-h-96 overflow-y-auto">
            {communes.map((c) => (
              <div key={c.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCommuneId(c.id)}
                  className={`text-left font-semibold ${
                    selectedCommuneId === c.id ? 'text-[#FFA94D]' : 'text-white'
                  }`}
                >
                  {c.name} <span className="font-normal text-slate-300">({c.region})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleCommune(c)}
                  className={`px-3 py-1 rounded-lg font-semibold ${
                    c.is_active
                      ? 'bg-[#143D29] border border-[#34D399]/35 text-[#6EE7B7]'
                      : 'bg-[#0B1E33] border border-[#244B73] text-slate-300'
                  }`}
                >
                  {c.is_active ? 'Activa' : 'Inactiva'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Sectores de la comuna seleccionada */}
        <section className="rounded-2xl bg-[#102C49] border border-[#244B73] p-6 space-y-4">
          <h2 className="font-display font-bold text-base text-white">
            Sectores administrables ({communes.find((c) => c.id === selectedCommuneId)?.name || '—'})
          </h2>
          <form onSubmit={handleAddSector} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newSectorName}
                onChange={(e) => setNewSectorName(e.target.value)}
                placeholder="Nombre del sector validado..."
                className="flex-1 rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white placeholder:text-slate-400 px-3 py-2 text-xs focus:border-[#FFA94D] focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#F28C28] text-[#0B1E33] text-xs font-bold hover:bg-[#FFA242]"
              >
                Crear sector
              </button>
            </div>
            <input
              type="text"
              value={newSectorDesc}
              onChange={(e) => setNewSectorDesc(e.target.value)}
              placeholder="Referencia breve (opcional)"
              className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white placeholder:text-slate-400 px-3 py-2 text-xs focus:border-[#FFA94D] focus:outline-none"
            />
          </form>

          <div className="divide-y divide-[#244B73] max-h-96 overflow-y-auto">
            {sectors.length === 0 ? (
              <p className="text-xs text-slate-300 py-4">Sin sectores registrados en esta comuna.</p>
            ) : (
              sectors.map((s) => (
                <div key={s.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-white">{s.name}</div>
                    {s.description && <div className="text-slate-300">{s.description}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleSector(s)}
                    className={`px-3 py-1 rounded-lg font-semibold ${
                      s.is_active
                        ? 'bg-[#143D29] border border-[#34D399]/35 text-[#6EE7B7]'
                        : 'bg-[#0B1E33] border border-[#244B73] text-slate-300'
                    }`}
                  >
                    {s.is_active ? 'Activo' : 'Desactivado'}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
