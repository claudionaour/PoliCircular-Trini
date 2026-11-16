import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, handleFirestoreError, OperationType, storage } from './firebase';
import {
  fetchImagesByProductIds,
  fetchLookupMaps,
  fetchProfilesMap,
  hydrateProductDoc,
} from './firestoreHelpers';
import type { Product, ProductCondition, ProductModality } from '../types/domain';

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  communeId?: string;
  sectorId?: string;
  modality?: ProductModality | '';
  condition?: ProductCondition | '';
  onlyAvailable?: boolean;
  dateRange?: 'all' | '7d' | '30d';
}

function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export async function listApprovedProducts(filters: ProductFilters = {}): Promise<Product[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'products'), where('status', '==', 'approved'))
    );

    if (snap.empty) return [];

    const maps = await fetchLookupMaps();
    const ownerIds = snap.docs.map((d) => String(d.data().owner_id || ''));
    const productIds = snap.docs.map((d) => d.id);
    const [profiles, images] = await Promise.all([
      fetchProfilesMap(ownerIds),
      fetchImagesByProductIds(productIds),
    ]);

    let items = snap.docs.map((docSnap) =>
      hydrateProductDoc(docSnap.id, docSnap.data(), { ...maps, profiles, images })
    );

    if (filters.onlyAvailable !== false) {
      items = items.filter((p) => p.available_quantity > 0);
    }
    if (filters.categoryId) {
      items = items.filter((p) => p.category_id === filters.categoryId);
    }
    if (filters.communeId) {
      items = items.filter((p) => p.commune_id === filters.communeId);
    }
    if (filters.sectorId) {
      items = items.filter((p) => p.sector_id === filters.sectorId);
    }
    if (filters.modality) {
      items = items.filter((p) => p.modality === filters.modality);
    }
    if (filters.condition) {
      items = items.filter((p) => p.condition === filters.condition);
    }
    if (filters.dateRange === '7d') {
      const cutoff = Date.now() - 7 * 86400000;
      items = items.filter((p) => new Date(p.created_at).getTime() >= cutoff);
    } else if (filters.dateRange === '30d') {
      const cutoff = Date.now() - 30 * 86400000;
      items = items.filter((p) => new Date(p.created_at).getTime() >= cutoff);
    }
    if (filters.search?.trim()) {
      const qNorm = normalizeSearchText(filters.search.trim());
      items = items.filter(
        (p) =>
          normalizeSearchText(p.title).includes(qNorm) ||
          normalizeSearchText(p.description).includes(qNorm) ||
          normalizeSearchText(p.categories?.name || '').includes(qNorm)
      );
    }

    return items.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'products');
  }
}

export async function listMyProducts(userId: string): Promise<Product[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'products'), where('owner_id', '==', userId))
    );
    if (snap.empty) return [];

    const maps = await fetchLookupMaps();
    const productIds = snap.docs.map((d) => d.id);
    const [profiles, images] = await Promise.all([
      fetchProfilesMap([userId]),
      fetchImagesByProductIds(productIds),
    ]);

    return snap.docs
      .map((docSnap) =>
        hydrateProductDoc(docSnap.id, docSnap.data(), { ...maps, profiles, images })
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'products');
  }
}

export async function getProductById(productId: string): Promise<Product | null> {
  try {
    const snap = await getDoc(doc(db, 'products', productId));
    if (!snap.exists()) return null;

    const maps = await fetchLookupMaps();
    const ownerId = String(snap.data().owner_id || '');
    const [profiles, images] = await Promise.all([
      fetchProfilesMap([ownerId]),
      fetchImagesByProductIds([productId]),
    ]);

    return hydrateProductDoc(snap.id, snap.data(), { ...maps, profiles, images });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `products/${productId}`);
  }
}

export interface CreateProductInput {
  ownerId: string;
  title: string;
  description: string;
  categoryId: string;
  condition: ProductCondition;
  modality: ProductModality;
  desiredExchangeItems?: string;
  totalQuantity: number;
  communeId: string;
  sectorId?: string | null;
  deliveryMethod: string;
  images: { file: File; isPrimary: boolean }[];
}

export async function createProductWithImages(input: CreateProductInput): Promise<Product> {
  const productRef = doc(collection(db, 'products'));
  const productId = productRef.id;

  const uploadedImages: {
    id: string;
    storage_path: string;
    public_url: string;
    is_primary: boolean;
    sort_order: number;
  }[] = [];

  for (let i = 0; i < input.images.length; i++) {
    const img = input.images[i];
    const storagePath = `products/${input.ownerId}/${productId}/${Date.now()}_${i}.webp`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, img.file, {
      contentType: img.file.type || 'image/webp',
      cacheControl: 'public,max-age=3600',
    });
    const publicUrl = await getDownloadURL(storageRef);
    const imgRef = doc(collection(db, 'product_images'));
    uploadedImages.push({
      id: imgRef.id,
      storage_path: storagePath,
      public_url: publicUrl,
      is_primary: img.isPrimary,
      sort_order: i,
    });
  }

  try {
    const batch = writeBatch(db);
    batch.set(productRef, {
      id: productId,
      owner_id: input.ownerId,
      category_id: input.categoryId,
      title: input.title.trim(),
      description: input.description.trim(),
      condition: input.condition,
      modality: input.modality,
      desired_exchange_items:
        input.modality === 'exchange' ? input.desiredExchangeItems?.trim() || null : null,
      total_quantity: input.totalQuantity,
      available_quantity: input.totalQuantity,
      reserved_quantity: 0,
      commune_id: input.communeId,
      sector_id: input.sectorId || null,
      delivery_method: input.deliveryMethod.trim(),
      status: 'pending',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    for (const img of uploadedImages) {
      batch.set(doc(db, 'product_images', img.id), {
        id: img.id,
        product_id: productId,
        owner_id: input.ownerId,
        storage_path: img.storage_path,
        public_url: img.public_url,
        is_primary: img.is_primary,
        sort_order: img.sort_order,
        created_at: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `products/${productId}`);
  }

  const created = await getProductById(productId);
  if (!created) {
    throw new Error('La publicación se creó, pero no fue posible recargar su detalle.');
  }
  return created;
}

export async function archiveOwnProduct(productId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'products', productId), {
      status: 'archived',
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `products/${productId}`);
  }
}
