import type { ImpactRecord } from '../types/domain';
import { formatChileDate, MODALITY_LABELS } from './formatters';

export function exportImpactCsv(records: ImpactRecord[], communeFilterName: string): void {
  const headers = [
    'Fecha',
    'Comuna',
    'Sector',
    'Categoria',
    'Modalidad',
    'Cantidad',
    'Peso_kg',
    'Tipo_de_peso',
  ];

  const rows = records.map((r) => [
    formatChileDate(r.created_at),
    r.communes?.name ?? '',
    r.sectors?.name ?? 'Referencia comunal',
    r.categories?.name ?? '',
    MODALITY_LABELS[r.modality],
    String(r.quantity),
    Number(r.weight_kg).toFixed(2),
    r.weight_type === 'measured' ? 'PESO MEDIDO (pesaje real)' : 'PESO ESTIMADO (referencia)',
  ]);

  const csvContent = [headers, ...rows]
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    `policircular-impacto-${communeFilterName.toLowerCase().replace(/\s+/g, '-')}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
