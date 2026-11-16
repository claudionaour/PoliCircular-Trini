import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { db, toIsoString, toNullableIsoString } from './firebase';
import { SEED_CATEGORIES, SEED_COMMUNES, SEED_SECTORS } from './seedService';
import type {
  Category,
  Commune,
  Product,
  ProductImage,
  Profile,
  Sector,
} from '../types/domain';

export function mapCommuneDoc(id: string, d: DocumentData): Commune {
  return {
    id,
    name: String(d.name || ''),
    region: String(d.region || ''),
    country: String(d.country || 'Chile'),
    timezone: String(d.timezone || 'America/Santiago'),
    latitude: typeof d.latitude === 'number' ? d.latitude : null,
    longitude: typeof d.longitude === 'number' ? d.longitude : null,
    is_active: Boolean(d.is_active),
    created_at: toIsoString(d.created_at),
  };
}

export function mapSectorDoc(id: string, d: DocumentData): Sector {
  return {
    id,
    commune_id: String(d.commune_id || ''),
    name: String(d.name || ''),
    description: d.description ? String(d.description) : null,
    approx_lat: typeof d.approx_lat === 'number' ? d.approx_lat : null,
    approx_lng: typeof d.approx_lng === 'number' ? d.approx_lng : null,
    is_active: Boolean(d.is_active),
    created_at: toIsoString(d.created_at),
  };
}

export function mapCategoryDoc(id: string, d: DocumentData): Category {
  return {
    id,
    slug: String(d.slug || id),
    name: String(d.name || ''),
    description: d.description ? String(d.description) : null,
    icon_name: String(d.icon_name || 'Package'),
    estimated_weight_kg: Number(d.estimated_weight_kg ?? 1),
    sort_order: Number(d.sort_order ?? 0),
    is_active: Boolean(d.is_active),
  };
}

export function mapProfileDoc(id: string, d: DocumentData): Profile {
  return {
    id,
    full_name: String(d.full_name || 'Participante'),
    username: String(d.username || id.slice(0, 8)),
    avatar_url: d.avatar_url ? String(d.avatar_url) : null,
    bio: d.bio ? String(d.bio) : null,
    commune_id: d.commune_id ? String(d.commune_id) : null,
    sector_id: d.sector_id ? String(d.sector_id) : null,
    account_type: d.account_type || 'individual',
    institution_id: d.institution_id ? String(d.institution_id) : null,
    institution_name: d.institution_name ? String(d.institution_name) : null,
    institution_description: d.institution_description ? String(d.institution_description) : null,
    responsible_person: d.responsible_person ? String(d.responsible_person) : null,
    institutional_code: d.institutional_code ? String(d.institutional_code) : null,
    is_minor_supervised: Boolean(d.is_minor_supervised),
    guardian_authorization_note: d.guardian_authorization_note
      ? String(d.guardian_authorization_note)
      : null,
    is_suspended: Boolean(d.is_suspended),
    suspension_reason: d.suspension_reason ? String(d.suspension_reason) : null,
    reputation_avg: Number(d.reputation_avg ?? 0),
    reputation_count: Number(d.reputation_count ?? 0),
    terms_accepted_at: toNullableIsoString(d.terms_accepted_at),
    created_at: toIsoString(d.created_at),
    updated_at: toIsoString(d.updated_at),
    communes: d.commune_name
      ? {
          id: String(d.commune_id || ''),
          name: String(d.commune_name),
          region: String(d.commune_region || 'Región de Los Lagos'),
        }
      : null,
    sectors: d.sector_name
      ? {
          id: String(d.sector_id || ''),
          name: String(d.sector_name),
          approx_lat: null,
          approx_lng: null,
        }
      : null,
  };
}

export function mapProductImageDoc(id: string, d: DocumentData): ProductImage {
  return {
    id,
    product_id: String(d.product_id || ''),
    storage_path: String(d.storage_path || ''),
    public_url: String(d.public_url || ''),
    is_primary: Boolean(d.is_primary),
    sort_order: Number(d.sort_order ?? 0),
  };
}

export async function fetchLookupMaps() {
  const [communesSnap, sectorsSnap, categoriesSnap] = await Promise.all([
    getDocs(collection(db, 'communes')),
    getDocs(collection(db, 'sectors')),
    getDocs(collection(db, 'categories')),
  ]);

  const communes = new Map<string, Commune>();
  communesSnap.forEach((snap) => communes.set(snap.id, mapCommuneDoc(snap.id, snap.data())));
  if (communes.size === 0) {
    SEED_COMMUNES.forEach((c) => communes.set(c.id, mapCommuneDoc(c.id, c)));
  }

  const sectors = new Map<string, Sector>();
  sectorsSnap.forEach((snap) => sectors.set(snap.id, mapSectorDoc(snap.id, snap.data())));
  if (sectors.size === 0) {
    SEED_SECTORS.forEach((s) => sectors.set(s.id, mapSectorDoc(s.id, s)));
  }

  const categories = new Map<string, Category>();
  categoriesSnap.forEach((snap) =>
    categories.set(snap.id, mapCategoryDoc(snap.id, snap.data()))
  );
  if (categories.size === 0) {
    SEED_CATEGORIES.forEach((cat) => categories.set(cat.id, mapCategoryDoc(cat.id, cat)));
  }

  return { communes, sectors, categories };
}

export async function fetchProfilesMap(userIds: string[]): Promise<Map<string, Profile>> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const result = new Map<string, Profile>();
  if (uniqueIds.length === 0) return result;

  const snaps = await Promise.all(
    uniqueIds.map((uid) => getDoc(doc(db, 'users', uid)).catch(() => null))
  );
  snaps.forEach((snap) => {
    if (snap?.exists()) {
      result.set(snap.id, mapProfileDoc(snap.id, snap.data()));
    }
  });
  return result;
}

export async function fetchImagesByProductIds(
  productIds: string[]
): Promise<Map<string, ProductImage[]>> {
  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));
  const map = new Map<string, ProductImage[]>();
  if (uniqueIds.length === 0) return map;

  // Firestore 'in' queries accept up to 30 values per batch
  const chunks: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += 30) {
    chunks.push(uniqueIds.slice(i, i + 30));
  }

  for (const chunk of chunks) {
    const snap = await getDocs(
      query(collection(db, 'product_images'), where('product_id', 'in', chunk))
    );
    snap.forEach((docSnap) => {
      const img = mapProductImageDoc(docSnap.id, docSnap.data());
      const existing = map.get(img.product_id) ?? [];
      existing.push(img);
      map.set(img.product_id, existing);
    });
  }

  map.forEach((imgs, key) => {
    map.set(
      key,
      imgs.sort((a, b) => a.sort_order - b.sort_order)
    );
  });

  return map;
}

export function hydrateProductDoc(
  id: string,
  d: DocumentData,
  maps: {
    communes: Map<string, Commune>;
    sectors: Map<string, Sector>;
    categories: Map<string, Category>;
    profiles: Map<string, Profile>;
    images: Map<string, ProductImage[]>;
  }
): Product {
  const owner = maps.profiles.get(String(d.owner_id || ''));
  return {
    id,
    owner_id: String(d.owner_id || ''),
    category_id: String(d.category_id || ''),
    title: String(d.title || ''),
    description: String(d.description || ''),
    condition: d.condition,
    modality: d.modality,
    desired_exchange_items: d.desired_exchange_items ? String(d.desired_exchange_items) : null,
    total_quantity: Number(d.total_quantity ?? 1),
    available_quantity: Number(d.available_quantity ?? 0),
    reserved_quantity: Number(d.reserved_quantity ?? 0),
    commune_id: String(d.commune_id || ''),
    sector_id: d.sector_id ? String(d.sector_id) : null,
    delivery_method: String(d.delivery_method || ''),
    status: d.status,
    moderation_notes: d.moderation_notes ? String(d.moderation_notes) : null,
    moderated_by: d.moderated_by ? String(d.moderated_by) : null,
    moderated_at: toNullableIsoString(d.moderated_at),
    expires_at: toNullableIsoString(d.expires_at),
    created_at: toIsoString(d.created_at),
    updated_at: toIsoString(d.updated_at),
    categories: maps.categories.get(String(d.category_id || '')) ?? null,
    communes: maps.communes.get(String(d.commune_id || '')) ?? null,
    sectors: d.sector_id ? maps.sectors.get(String(d.sector_id)) ?? null : null,
    profiles: owner
      ? {
          id: owner.id,
          full_name: owner.full_name,
          username: owner.username,
          avatar_url: owner.avatar_url,
          account_type: owner.account_type,
          institution_name: owner.institution_name,
          reputation_avg: owner.reputation_avg,
          reputation_count: owner.reputation_count,
          is_minor_supervised: owner.is_minor_supervised,
        }
      : null,
    product_images: maps.images.get(id) ?? [],
  };
}
