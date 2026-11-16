import React, { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { createReport } from '../services/adminService';
import { useAuth } from '../context/AuthContext';
import type { ReportRecord } from '../types/domain';

interface ReportModalProps {
  targetType: ReportRecord['target_type'];
  targetId: string;
  targetTitle: string;
  onClose: () => void;
}

const REASON_OPTIONS = [
  'Producto prohibido por reglas comunitarias',
  'Intento de cobro o compraventa con dinero',
  'Contenido ofensivo o conducta irrespetuosa',
  'Información falsa o sospecha de fraude',
  'Riesgo de seguridad para menores o participantes',
  'Otro motivo',
];

export const ReportModal: React.FC<ReportModalProps> = ({
  targetType,
  targetId,
  targetTitle,
  onClose,
}) => {
  const { user } = useAuth();
  const [reasonCategory, setReasonCategory] = useState(REASON_OPTIONS[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (description.trim().length < 10) {
      setError('Describe el problema con al menos 10 caracteres para que moderación pueda revisarlo.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createReport({
        reporterId: user.uid,
        targetType,
        targetId,
        reasonCategory,
        description,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible enviar la denuncia.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[#102C49] p-6 shadow-xl border border-[#244B73]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-[#FFA94D]" />
            <h3 className="font-display text-lg font-bold text-white">Denunciar para revisión</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white rounded-lg"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-300">Elemento reportado: {targetTitle}</p>

        {success ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl bg-[#143D29] border border-[#34D399]/35 p-4 text-sm text-[#6EE7B7]">
              Tu denuncia fue registrada con trazabilidad para el equipo de moderación.
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-[#F28C28] py-2.5 text-sm font-bold text-[#0B1E33] hover:bg-[#FFA242]"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Motivo principal
              </label>
              <select
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value)}
                className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white px-3 py-2.5 text-sm focus:border-[#FFA94D] focus:outline-none"
              >
                {REASON_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Detalle de la situación
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explica lo ocurrido de forma clara y respetuosa..."
                className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white placeholder:text-slate-400 px-3 py-2.5 text-sm focus:border-[#FFA94D] focus:outline-none"
              />
            </div>

            {error && (
              <p className="text-xs text-red-200 bg-red-950/70 border border-red-400/40 p-2.5 rounded-lg">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-[#F28C28] text-sm font-bold text-[#0B1E33] hover:bg-[#FFA242] disabled:opacity-60"
              >
                {submitting ? 'Enviando...' : 'Enviar denuncia'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
