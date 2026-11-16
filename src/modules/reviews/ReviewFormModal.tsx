import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import { submitExchangeReviewRpc } from '../../services/exchangeService';

interface ReviewFormModalProps {
  exchangeId: string;
  targetName: string;
  onSuccess: () => void;
  onClose: () => void;
}

const CRITERIA = [
  { key: 'compliance', label: 'Cumplimiento' },
  { key: 'punctuality', label: 'Puntualidad' },
  { key: 'condition', label: 'Estado del producto' },
  { key: 'communication', label: 'Comunicación' },
  { key: 'respect', label: 'Respeto' },
] as const;

export const ReviewFormModal: React.FC<ReviewFormModalProps> = ({
  exchangeId,
  targetName,
  onSuccess,
  onClose,
}) => {
  const [scores, setScores] = useState<Record<string, number>>({
    compliance: 5,
    punctuality: 5,
    condition: 5,
    communication: 5,
    respect: 5,
  });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submitExchangeReviewRpc({
        exchangeId,
        compliance: scores.compliance,
        punctuality: scores.punctuality,
        condition: scores.condition,
        communication: scores.communication,
        respect: scores.respect,
        comment,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar la evaluación.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[#102C49] p-6 shadow-xl border border-[#244B73] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-white">Evaluar experiencia</h3>
            <p className="text-xs text-slate-300">Contraparte: {targetName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {CRITERIA.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-200">{item.label}</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setScores((prev) => ({ ...prev, [item.key]: star }))}
                    className="p-1"
                    aria-label={`${item.label} ${star} estrellas`}
                  >
                    <Star
                      className={`h-5 w-5 ${
                        star <= scores[item.key]
                          ? 'text-[#FFA94D] fill-[#FFA94D]'
                          : 'text-slate-400'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Comentario (opcional)
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comparte cómo fue la coordinación y entrega..."
              className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white placeholder:text-slate-400 px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <p className="text-xs text-red-200 bg-red-950/70 border border-red-400/40 p-2.5 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-[#F28C28] text-[#0B1E33] text-xs font-bold hover:bg-[#FFA242] disabled:opacity-50"
            >
              {submitting ? 'Enviando...' : 'Publicar evaluación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
