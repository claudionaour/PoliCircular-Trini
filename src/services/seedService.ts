import { collection, doc, getDocs, limit, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

export const SEED_COMMUNES = [
  { id: 'castro', name: 'Castro', region: 'Región de Los Lagos', country: 'Chile', timezone: 'America/Santiago', latitude: -42.4824, longitude: -73.7643, is_active: true },
  { id: 'ancud', name: 'Ancud', region: 'Región de Los Lagos', country: 'Chile', timezone: 'America/Santiago', latitude: -41.8697, longitude: -73.8286, is_active: false },
  { id: 'quellon', name: 'Quellón', region: 'Región de Los Lagos', country: 'Chile', timezone: 'America/Santiago', latitude: -43.1189, longitude: -73.6156, is_active: false },
  { id: 'dalcahue', name: 'Dalcahue', region: 'Región de Los Lagos', country: 'Chile', timezone: 'America/Santiago', latitude: -42.3789, longitude: -73.6494, is_active: false },
  { id: 'chonchi', name: 'Chonchi', region: 'Región de Los Lagos', country: 'Chile', timezone: 'America/Santiago', latitude: -42.6233, longitude: -73.7728, is_active: false },
  { id: 'curaco-de-velez', name: 'Curaco de Vélez', region: 'Región de Los Lagos', country: 'Chile', timezone: 'America/Santiago', latitude: -42.4414, longitude: -73.6033, is_active: false },
  { id: 'quinchao', name: 'Quinchao', region: 'Región de Los Lagos', country: 'Chile', timezone: 'America/Santiago', latitude: -42.4717, longitude: -73.4922, is_active: false },
  { id: 'puqueldon', name: 'Puqueldón', region: 'Región de Los Lagos', country: 'Chile', timezone: 'America/Santiago', latitude: -42.5961, longitude: -73.6669, is_active: false },
  { id: 'queilen', name: 'Queilen', region: 'Región de Los Lagos', country: 'Chile', timezone: 'America/Santiago', latitude: -42.8897, longitude: -73.4736, is_active: false },
  { id: 'quemchi', name: 'Quemchi', region: 'Región de Los Lagos', country: 'Chile', timezone: 'America/Santiago', latitude: -42.1422, longitude: -73.4756, is_active: false },
];

export const SEED_SECTORS = [
  { id: 'castro-centro-urbano', commune_id: 'castro', name: 'Castro Centro Urbano', description: 'Plaza de Armas, Costanera, Gamboa, Llau-Llao y barrios urbanos de Castro', approx_lat: -42.4824, approx_lng: -73.7643, is_active: true },
  { id: 'castro-alto-nercon', commune_id: 'castro', name: 'Castro Alto / Nercón', description: 'Sector residencial alto, Nercón y alrededores', approx_lat: -42.495, approx_lng: -73.775, is_active: true },
  { id: 'castro-ten-ten-yutuy', commune_id: 'castro', name: 'Ten-Ten / Yutuy / Putemún', description: 'Península de Rilán norte y sector costero', approx_lat: -42.455, approx_lng: -73.735, is_active: true },
];

export const SEED_CATEGORIES = [
  { id: 'ropa-y-calzado', slug: 'ropa-y-calzado', name: 'Ropa y Calzado', description: 'Prendas limpias, abrigos, calzado y textiles en buen estado', icon_name: 'Shirt', estimated_weight_kg: 1.2, sort_order: 1, is_active: true },
  { id: 'libros-y-utiles', slug: 'libros-y-utiles', name: 'Libros y Útiles Escolares', description: 'Textos, cuadernos sin uso, mochilas y material pedagógico', icon_name: 'BookOpen', estimated_weight_kg: 0.9, sort_order: 2, is_active: true },
  { id: 'hogar-y-decoracion', slug: 'hogar-y-decoracion', name: 'Hogar y Decoración', description: 'Menaje, textiles del hogar, lámparas y utensilios', icon_name: 'Home', estimated_weight_kg: 2.0, sort_order: 3, is_active: true },
  { id: 'muebles', slug: 'muebles', name: 'Muebles', description: 'Mesas, sillas, repisas y mobiliario reparable o listo para usar', icon_name: 'Armchair', estimated_weight_kg: 12.0, sort_order: 4, is_active: true },
  { id: 'electronica-reutilizable', slug: 'electronica-reutilizable', name: 'Electrónica Reutilizable', description: 'Equipos funcionales o reparables, cables, periféricos y radios', icon_name: 'Cpu', estimated_weight_kg: 2.5, sort_order: 5, is_active: true },
  { id: 'herramientas', slug: 'herramientas', name: 'Herramientas', description: 'Herramientas manuales, de taller, carpintería y jardín', icon_name: 'Wrench', estimated_weight_kg: 3.0, sort_order: 6, is_active: true },
  { id: 'juguetes', slug: 'juguetes', name: 'Juguetes', description: 'Juegos didácticos, rompecabezas y juguetes completos', icon_name: 'Puzzle', estimated_weight_kg: 0.8, sort_order: 7, is_active: true },
  { id: 'deportes', slug: 'deportes', name: 'Deportes', description: 'Implementos deportivos, bicicletas y equipamiento outdoor', icon_name: 'Bike', estimated_weight_kg: 3.5, sort_order: 8, is_active: true },
  { id: 'jardineria', slug: 'jardineria', name: 'Jardinería', description: 'Maceteros, semillas, herramientas de huerta y compostaje', icon_name: 'Sprout', estimated_weight_kg: 2.2, sort_order: 9, is_active: true },
  { id: 'materiales-talleres', slug: 'materiales-talleres', name: 'Materiales para Talleres o Reciclaje Creativo', description: 'Maderas, lanas, retazos textiles, cartones limpios y frascos', icon_name: 'Scissors', estimated_weight_kg: 1.5, sort_order: 10, is_active: true },
  { id: 'articulos-escolares', slug: 'articulos-escolares', name: 'Artículos Escolares', description: 'Calculadoras, estuches, carpetas, instrumentos musicales escolares', icon_name: 'Backpack', estimated_weight_kg: 1.0, sort_order: 11, is_active: true },
];

export const SEED_ACHIEVEMENTS = [
  { id: 'first_second_chance', code: 'first_second_chance', name: 'Primera Segunda Oportunidad', description: 'Completaste tu primer regalo o intercambio circular confirmado.', category: 'tree', required_operations: 1, icon_name: 'Sprout' },
  { id: 'growing_sprout', code: 'growing_sprout', name: 'Brote en Crecimiento', description: 'Alcanzaste 2 entregas circulares exitosas.', category: 'tree', required_operations: 2, icon_name: 'Leaf' },
  { id: 'neighbor_circular', code: 'neighbor_circular', name: 'Vecino Circular', description: 'Alcanzaste 5 operaciones comunitarias sin residuos.', category: 'tree', required_operations: 5, icon_name: 'TreePine' },
  { id: 'castro_guardian', code: 'castro_guardian', name: 'Guardián del Territorio', description: 'Superaste 9 operaciones circulares y tu árbol está desarrollado.', category: 'tree', required_operations: 9, icon_name: 'Award' },
  { id: 'circular_mentor', code: 'circular_mentor', name: 'Árbol Frutal Comunitario', description: 'Completaste 15 o más entregas circulares en la comunidad.', category: 'tree', required_operations: 15, icon_name: 'Trees' },
  { id: 'school_ally', code: 'school_ally', name: 'Aliado Educativo', description: 'Participación destacada en reutilización escolar y aprendizaje.', category: 'education', required_operations: 3, icon_name: 'GraduationCap' },
  { id: 'zero_waste_promoter', code: 'zero_waste_promoter', name: 'Impulsor Basura Cero', description: 'Has evitado residuos recuperando materiales útiles.', category: 'milestone', required_operations: 6, icon_name: 'Recycle' },
];

let seedAttempted = false;

export async function ensureInitialTerritorialSeed(force = false): Promise<boolean> {
  if (seedAttempted && !force) return false;
  seedAttempted = true;

  const existingCommunes = await getDocs(
    query(collection(db, 'communes'), where('is_active', 'in', [true, false]), limit(1))
  );
  const existingCategories = await getDocs(
    query(collection(db, 'categories'), where('is_active', 'in', [true, false]), limit(1))
  );
  const existingAchievements = await getDocs(
    query(collection(db, 'achievements'), where('required_operations', '>=', 1), limit(1))
  );

  if (!force && !existingCommunes.empty && !existingCategories.empty && !existingAchievements.empty) {
    return false;
  }

  const batch = writeBatch(db);

  for (const c of SEED_COMMUNES) {
    batch.set(doc(db, 'communes', c.id), {
      ...c,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  }

  for (const s of SEED_SECTORS) {
    batch.set(doc(db, 'sectors', s.id), {
      ...s,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  }

  for (const cat of SEED_CATEGORIES) {
    batch.set(doc(db, 'categories', cat.id), cat);
  }

  for (const ach of SEED_ACHIEVEMENTS) {
    batch.set(doc(db, 'achievements', ach.id), ach);
  }

  await batch.commit();
  return true;
}
