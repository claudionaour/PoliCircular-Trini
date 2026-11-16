const PROHIBITED_PATTERNS: { pattern: RegExp; category: string }[] = [
  { pattern: /\b(arma|pistola|revolver|rifles?|escopeta|munici[oó]n|cuchillo de combate|navaja)\b/i, category: 'Armas o elementos cortopunzantes peligrosos' },
  { pattern: /\b(droga|marihuana|coca[ií]na|cannabis|estupefaciente)\b/i, category: 'Drogas o sustancias ilícitas' },
  { pattern: /\b(medicamento|f[aá]rmaco|antib[ií]otico|psicotr[oó]pico|receta m[eé]dica|insulina)\b/i, category: 'Medicamentos de uso restringido' },
  { pattern: /\b(veneno|pesticida|plaguicida|explosivo|pirotecnia|fuegos artificiales|[aá]cido muri[aá]tico)\b/i, category: 'Sustancias peligrosas o inflamables' },
  { pattern: /\b(vendo|precio|\$\s*\d+|pesos|clp|transferencia|efectivo|cuotas|rebaja|oferta comercial)\b/i, category: 'Contenido monetario o compraventa prohibida en PoliCircular' },
  { pattern: /\b(cachorro|perrito|gatito|mascota en adopci[oó]n|venta de animales)\b/i, category: 'Animales vivos (no permitidos en publicaciones de objetos)' },
];

export function validateCommunityProductRules(title: string, description: string): string | null {
  const combined = `${title} ${description}`;
  for (const rule of PROHIBITED_PATTERNS) {
    if (rule.pattern.test(combined)) {
      return `La publicación infringe las reglas comunitarias: ${rule.category}. PoliCircular prohíbe dinero, armas, drogas, medicamentos restringidos, sustancias peligrosas y animales.`;
    }
  }
  return null;
}

export const PROHIBITED_ITEMS_LIST = [
  'Armas de fuego, réplicas o armas blancas peligrosas.',
  'Drogas, alcohol y sustancias ilícitas.',
  'Sustancias tóxicas, inflamables, pesticidas o pirotecnia.',
  'Medicamentos de uso restringido o con receta médica.',
  'Alimentos vencidos, abiertos o en condiciones inseguras.',
  'Productos robados, falsificados o de procedencia ilícita.',
  'Animales vivos.',
  'Cualquier operación con dinero, precios o cobros.',
];
