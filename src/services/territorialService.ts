import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { mapCategoryDoc, mapCommuneDoc, mapSectorDoc } from './firestoreHelpers';
import { SEED_CATEGORIES, SEED_COMMUNES, SEED_SECTORS } from './seedService';
import type { Category, Commune, Sector } from '../types/domain';

export async function listActiveCommunes(): Promise<Commune[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'communes'), where('is_active', '==', true))
    );
    if (snap.empty) {
      return SEED_COMMUNES.filter((c) => c.is_active).map((c) =>
        mapCommuneDoc(c.id, c)
      );
    }
    return snap.docs
      .map((d) => mapCommuneDoc(d.id, d.data()))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'communes');
  }
}

export async function listAllCommunes(): Promise<Commune[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'communes'), where('is_active', 'in', [true, false]))
    );
    if (snap.empty) {
      return SEED_COMMUNES.map((c) => mapCommuneDoc(c.id, c)).sort((a, b) =>
        a.name.localeCompare(b.name, 'es')
      );
    }
    return snap.docs
      .map((d) => mapCommuneDoc(d.id, d.data()))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'communes');
  }
}

export async function listSectorsByCommune(
  communeId: string,
  activeOnly = true
): Promise<Sector[]> {
  if (!communeId) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, 'sectors'),
        activeOnly
          ? where('is_active', '==', true)
          : where('is_active', 'in', [true, false])
      )
    );
    const filtered = snap.docs
      .map((d) => mapSectorDoc(d.id, d.data()))
      .filter((s) => s.commune_id === communeId && (!activeOnly || s.is_active))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    if (filtered.length === 0 && snap.empty) {
      return SEED_SECTORS.filter(
        (s) => s.commune_id === communeId && (!activeOnly || s.is_active)
      )
        .map((s) => mapSectorDoc(s.id, s))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }
    return filtered;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'sectors');
  }
}

export async function listCategories(): Promise<Category[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'categories'), where('is_active', '==', true))
    );
    if (snap.empty) {
      return SEED_CATEGORIES.filter((c) => c.is_active)
        .map((c) => mapCategoryDoc(c.id, c))
        .sort((a, b) => a.sort_order - b.sort_order);
    }
    return snap.docs
      .map((d) => mapCategoryDoc(d.id, d.data()))
      .sort((a, b) => a.sort_order - b.sort_order);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'categories');
  }
}
