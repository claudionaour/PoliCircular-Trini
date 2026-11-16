import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, toIsoString } from './firebase';
import { fetchLookupMaps } from './firestoreHelpers';
import type {
  Achievement,
  ImpactRecord,
  UserAchievement,
  UserTreeProgress,
} from '../types/domain';

export async function getTreeProgress(userId: string): Promise<UserTreeProgress | null> {
  try {
    const snap = await getDoc(doc(db, 'user_tree_progress', userId));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      user_id: userId,
      completed_operations: Number(d.completed_operations ?? 0),
      completed_gifts: Number(d.completed_gifts ?? 0),
      completed_exchanges: Number(d.completed_exchanges ?? 0),
      current_stage: d.current_stage,
      updated_at: toIsoString(d.updated_at),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `user_tree_progress/${userId}`);
  }
}

export async function listAllAchievements(): Promise<Achievement[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'achievements'),
        where('required_operations', '>=', 1),
        orderBy('required_operations', 'asc')
      )
    );
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        code: String(data.code || d.id),
        name: String(data.name || ''),
        description: String(data.description || ''),
        category: data.category,
        required_operations: Number(data.required_operations ?? 1),
        icon_name: String(data.icon_name || 'Award'),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'achievements');
  }
}

export async function listUserAchievements(userId: string): Promise<UserAchievement[]> {
  try {
    const [uaSnap, allAchievements] = await Promise.all([
      getDocs(query(collection(db, 'user_achievements'), where('user_id', '==', userId))),
      listAllAchievements(),
    ]);
    const achMap = new Map(allAchievements.map((a) => [a.id, a]));
    return uaSnap.docs
      .map((d) => {
        const data = d.data();
        const achId = String(data.achievement_id || '');
        return {
          id: d.id,
          user_id: String(data.user_id || userId),
          achievement_id: achId,
          unlocked_at: toIsoString(data.unlocked_at),
          achievements: achMap.get(achId) ?? null,
        };
      })
      .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'user_achievements');
  }
}

export async function listImpactRecords(communeId?: string): Promise<ImpactRecord[]> {
  try {
    const q = query(collection(db, 'impact_records'), where('quantity', '>=', 1));
    const [snap, maps] = await Promise.all([getDocs(q), fetchLookupMaps()]);
    return snap.docs
      .filter((d) => !communeId || String(d.data().commune_id || '') === communeId)
      .map((d) => {
        const data = d.data();
        const cat = maps.categories.get(String(data.category_id || ''));
        const com = maps.communes.get(String(data.commune_id || ''));
        const sec = data.sector_id ? maps.sectors.get(String(data.sector_id)) : null;
        return {
          id: d.id,
          exchange_id: String(data.exchange_id || d.id),
          product_id: String(data.product_id || ''),
          category_id: String(data.category_id || ''),
          commune_id: String(data.commune_id || ''),
          sector_id: data.sector_id ? String(data.sector_id) : null,
          modality: data.modality,
          quantity: Number(data.quantity ?? 1),
          weight_kg: Number(data.weight_kg ?? 0),
          weight_type: data.weight_type,
          created_at: toIsoString(data.created_at),
          categories: cat ? { name: cat.name } : null,
          communes: com ? { name: com.name } : null,
          sectors: sec ? { name: sec.name } : null,
        } satisfies ImpactRecord;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'impact_records');
  }
}

export async function getCommunityParticipationCounts(): Promise<{
  participantsCount: number;
  organizationsCount: number;
}> {
  try {
    const snap = await getDocs(
      query(collection(db, 'users'), where('is_suspended', '==', false))
    );
    let orgCount = 0;
    snap.docs.forEach((d) => {
      const t = d.data().account_type;
      if (t === 'organization' || t === 'educational') {
        orgCount += 1;
      }
    });
    return {
      participantsCount: snap.size,
      organizationsCount: orgCount,
    };
  } catch {
    return { participantsCount: 0, organizationsCount: 0 };
  }
}

export async function saveEducationModuleProgress(
  userId: string,
  moduleSlug: string,
  quizScore: number
): Promise<void> {
  const docId = `${userId}_${moduleSlug}`;
  try {
    await setDoc(doc(db, 'education_progress', docId), {
      id: docId,
      user_id: userId,
      module_slug: moduleSlug,
      quiz_score: quizScore,
      completed_at: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `education_progress/${docId}`);
  }
}

export async function listEducationProgress(
  userId: string
): Promise<{ module_slug: string; quiz_score: number; completed_at: string }[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'education_progress'), where('user_id', '==', userId))
    );
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        module_slug: String(data.module_slug || ''),
        quiz_score: Number(data.quiz_score ?? 100),
        completed_at: toIsoString(data.completed_at),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'education_progress');
  }
}
