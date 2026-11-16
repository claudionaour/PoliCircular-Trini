import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  ENABLE_CLOUD_FUNCTIONS,
  auth,
  db,
  functions,
  handleFirestoreError,
  OperationType,
  toIsoString,
  toNullableIsoString,
} from './firebase';
import {
  fetchImagesByProductIds,
  fetchLookupMaps,
  fetchProfilesMap,
  hydrateProductDoc,
  mapCommuneDoc,
  mapProfileDoc,
  mapSectorDoc,
} from './firestoreHelpers';
import type {
  Commune,
  EducationalInstitution,
  InstitutionBadge,
  ModerationLog,
  Product,
  Profile,
  ReportRecord,
  Sector,
  UserRole,
} from '../types/domain';

export interface AdminDashboardStats {
  usersCount: number;
  pendingProducts: number;
  approvedProducts: number;
  rejectedProducts: number;
  requestsCount: number;
  matchesCount: number;
  completedExchanges: number;
  openReports: number;
}

function slugifyId(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || `item-${Date.now()}`
  );
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  try {
    const [usersSnap, productsSnap, reqSnap, matchSnap, exSnap, repSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'match_requests')),
      getDocs(collection(db, 'matches')),
      getDocs(collection(db, 'exchanges')),
      getDocs(collection(db, 'reports')),
    ]);

    let pendingProducts = 0;
    let approvedProducts = 0;
    let rejectedProducts = 0;
    productsSnap.forEach((d) => {
      const s = d.data().status;
      if (s === 'pending') pendingProducts += 1;
      else if (s === 'approved') approvedProducts += 1;
      else if (s === 'rejected') rejectedProducts += 1;
    });

    let completedExchanges = 0;
    exSnap.forEach((d) => {
      if (d.data().status === 'completed') completedExchanges += 1;
    });

    let openReports = 0;
    repSnap.forEach((d) => {
      const s = d.data().status;
      if (s === 'open' || s === 'under_review') openReports += 1;
    });

    return {
      usersCount: usersSnap.size,
      pendingProducts,
      approvedProducts,
      rejectedProducts,
      requestsCount: reqSnap.size,
      matchesCount: matchSnap.size,
      completedExchanges,
      openReports,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'admin_stats');
  }
}

export async function listModerationQueue(statusFilter?: string): Promise<Product[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'products'), orderBy('created_at', 'desc'))
    );
    const docs = statusFilter
      ? snap.docs.filter((d) => d.data().status === statusFilter)
      : snap.docs;

    if (docs.length === 0) return [];
    const maps = await fetchLookupMaps();
    const ownerIds = docs.map((d) => String(d.data().owner_id || ''));
    const productIds = docs.map((d) => d.id);
    const [profiles, images] = await Promise.all([
      fetchProfilesMap(ownerIds),
      fetchImagesByProductIds(productIds),
    ]);

    return docs.map((d) =>
      hydrateProductDoc(d.id, d.data(), { ...maps, profiles, images })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'products');
  }
}

export async function moderateProductRpc(
  productId: string,
  action: 'approve' | 'reject' | 'suspend',
  reason?: string
): Promise<Product> {
  const decision =
    action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'suspended';

  if (ENABLE_CLOUD_FUNCTIONS) {
    const fn = httpsCallable(functions, 'moderateProduct');
    await fn({ productId, decision, notes: reason });
    const updatedSnap = await getDoc(doc(db, 'products', productId));
    return { id: updatedSnap.id, ...(updatedSnap.data() as Omit<Product, 'id'>) };
  }

  const actorUid = auth.currentUser?.uid;
  if (!actorUid) throw new Error('Sesión administrativa requerida.');

  const prodRef = doc(db, 'products', productId);
  const prodSnap = await getDoc(prodRef);
  if (!prodSnap.exists()) throw new Error('Publicación no encontrada.');
  const prod = prodSnap.data();

  try {
    const batch = writeBatch(db);
    batch.update(prodRef, {
      status: decision,
      moderation_notes: reason?.trim() || null,
      moderated_by: actorUid,
      moderated_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    const logRef = doc(collection(db, 'moderation_logs'));
    batch.set(logRef, {
      id: logRef.id,
      actor_id: actorUid,
      target_type: 'product',
      target_id: productId,
      action: `product_${decision}`,
      previous_status: String(prod.status || ''),
      new_status: decision,
      notes: reason?.trim() || null,
      created_at: serverTimestamp(),
    });

    const notifRef = doc(collection(db, 'notifications'));
    batch.set(notifRef, {
      id: notifRef.id,
      user_id: String(prod.owner_id),
      event_type: `product_${decision}`,
      title:
        decision === 'approved'
          ? '¡Tu publicación fue aprobada!'
          : decision === 'rejected'
            ? 'Tu publicación requiere ajustes'
            : 'Tu publicación fue suspendida',
      body:
        decision === 'approved'
          ? `“${prod.title}” ya está visible para la comunidad de PoliCircular.`
          : `“${prod.title}” recibió observaciones: ${reason || 'Revisa las reglas comunitarias.'}`,
      link_path: '/mis-publicaciones',
      is_read: false,
      created_at: serverTimestamp(),
    });

    await batch.commit();
    const afterSnap = await getDoc(prodRef);
    return { id: afterSnap.id, ...(afterSnap.data() as Omit<Product, 'id'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `products/${productId}`);
  }
}

export async function listModerationLogs(): Promise<ModerationLog[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'moderation_logs'), orderBy('created_at', 'desc'), limit(100))
    );
    if (snap.empty) return [];
    const actorIds = snap.docs.map((d) => String(d.data().actor_id || ''));
    const profiles = await fetchProfilesMap(actorIds);

    return snap.docs.map((d) => {
      const data = d.data();
      const actor = profiles.get(String(data.actor_id || ''));
      return {
        id: d.id,
        actor_id: String(data.actor_id || ''),
        target_type: String(data.target_type || ''),
        target_id: String(data.target_id || ''),
        action: String(data.action || ''),
        previous_status: data.previous_status ? String(data.previous_status) : null,
        new_status: data.new_status ? String(data.new_status) : null,
        notes: data.notes ? String(data.notes) : null,
        created_at: toIsoString(data.created_at),
        actor: actor
          ? { full_name: actor.full_name, username: actor.username }
          : null,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'moderation_logs');
  }
}

export async function listUsersForAdmin(search?: string): Promise<Profile[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'users'), orderBy('created_at', 'desc'), limit(100))
    );
    let profiles = snap.docs.map((d) => mapProfileDoc(d.id, d.data()));
    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      profiles = profiles.filter(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          p.username.toLowerCase().includes(q) ||
          (p.institution_name || '').toLowerCase().includes(q)
      );
    }
    return profiles;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
  }
}

export async function listUserRolesMapAdmin(): Promise<Map<string, UserRole[]>> {
  const map = new Map<string, UserRole[]>();
  try {
    const snap = await getDocs(collection(db, 'user_roles'));
    snap.forEach((d) => {
      const roles = (d.data().roles as UserRole[] | undefined) || ['user'];
      map.set(d.id, roles);
    });
  } catch {
    // Si no tiene permiso de listado completo, devuelve mapa vacío sin romper la vista
  }
  return map;
}

export async function assignUserRolesAdmin(
  targetUserId: string,
  roles: UserRole[]
): Promise<UserRole[]> {
  if (ENABLE_CLOUD_FUNCTIONS) {
    const fn = httpsCallable<{ targetUserId: string; roles: UserRole[] }, { roles: UserRole[] }>(
      functions,
      'assignUserRole'
    );
    const res = await fn({ targetUserId, roles });
    return res.data.roles;
  }

  const actorUid = auth.currentUser?.uid;
  if (!actorUid) throw new Error('Sesión requerida.');
  const sanitized = Array.from(new Set<UserRole>(['user', ...roles]));

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'user_roles', targetUserId), {
      user_id: targetUserId,
      roles: sanitized,
      assigned_by: actorUid,
      updated_at: serverTimestamp(),
    });
    const logRef = doc(collection(db, 'moderation_logs'));
    batch.set(logRef, {
      id: logRef.id,
      actor_id: actorUid,
      target_type: 'user_roles',
      target_id: targetUserId,
      action: 'assign_roles',
      new_status: sanitized.join(','),
      notes: 'Roles actualizados por Superadministrador',
      created_at: serverTimestamp(),
    });
    await batch.commit();
    return sanitized;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `user_roles/${targetUserId}`);
  }
}

export async function toggleUserSuspensionRpc(
  userId: string,
  suspend: boolean,
  reason?: string
): Promise<Profile> {
  const actorUid = auth.currentUser?.uid;
  if (!actorUid) throw new Error('Sesión requerida.');

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', userId), {
      is_suspended: suspend,
      suspension_reason: suspend ? reason?.trim() || 'Suspendido por administración' : null,
      updated_at: serverTimestamp(),
    });
    const logRef = doc(collection(db, 'moderation_logs'));
    batch.set(logRef, {
      id: logRef.id,
      actor_id: actorUid,
      target_type: 'user',
      target_id: userId,
      action: suspend ? 'user_suspended' : 'user_reactivated',
      new_status: suspend ? 'suspended' : 'active',
      notes: reason?.trim() || null,
      created_at: serverTimestamp(),
    });
    await batch.commit();
    const updated = await getDoc(doc(db, 'users', userId));
    return mapProfileDoc(updated.id, updated.data()!);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

export async function saveCommuneAdmin(payload: {
  id?: string;
  name: string;
  region: string;
  is_active: boolean;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<Commune> {
  const docId = payload.id || slugifyId(payload.name);
  try {
    if (payload.id) {
      await updateDoc(doc(db, 'communes', docId), {
        name: payload.name.trim(),
        region: payload.region.trim(),
        is_active: payload.is_active,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        updated_at: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'communes', docId), {
        id: docId,
        name: payload.name.trim(),
        region: payload.region.trim(),
        country: 'Chile',
        timezone: 'America/Santiago',
        is_active: payload.is_active,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    }
    const snap = await getDoc(doc(db, 'communes', docId));
    return mapCommuneDoc(snap.id, snap.data()!);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `communes/${docId}`);
  }
}

export async function saveSectorAdmin(payload: {
  id?: string;
  commune_id: string;
  name: string;
  description?: string;
  approx_lat?: number | null;
  approx_lng?: number | null;
  is_active: boolean;
}): Promise<Sector> {
  const docId = payload.id || `${payload.commune_id}-${slugifyId(payload.name)}`;
  try {
    if (payload.id) {
      await updateDoc(doc(db, 'sectors', docId), {
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        approx_lat: payload.approx_lat ?? null,
        approx_lng: payload.approx_lng ?? null,
        is_active: payload.is_active,
        updated_at: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'sectors', docId), {
        id: docId,
        commune_id: payload.commune_id,
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        approx_lat: payload.approx_lat ?? null,
        approx_lng: payload.approx_lng ?? null,
        is_active: payload.is_active,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    }
    const snap = await getDoc(doc(db, 'sectors', docId));
    return mapSectorDoc(snap.id, snap.data()!);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `sectors/${docId}`);
  }
}

export async function listEducationalInstitutions(): Promise<EducationalInstitution[]> {
  try {
    const [snap, maps] = await Promise.all([
      getDocs(
        query(collection(db, 'educational_institutions'), where('is_verified', 'in', [true, false]))
      ),
      fetchLookupMaps(),
    ]);
    return snap.docs
      .map((d) => {
        const data = d.data();
        const com = data.commune_id ? maps.communes.get(String(data.commune_id)) : null;
        return {
          id: d.id,
          name: String(data.name || ''),
          institution_code: data.institution_code ? String(data.institution_code) : null,
          commune_id: data.commune_id ? String(data.commune_id) : null,
          sector_id: data.sector_id ? String(data.sector_id) : null,
          responsible_name: String(data.responsible_name || ''),
          badge_level: data.badge_level as InstitutionBadge,
          is_verified: Boolean(data.is_verified),
          created_at: toIsoString(data.created_at),
          communes: com ? { name: com.name } : null,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'educational_institutions');
  }
}

export async function saveEducationalInstitution(payload: {
  id?: string;
  name: string;
  institution_code?: string;
  commune_id?: string | null;
  responsible_name: string;
  badge_level: InstitutionBadge;
  is_verified: boolean;
}): Promise<EducationalInstitution> {
  const instRef = payload.id
    ? doc(db, 'educational_institutions', payload.id)
    : doc(collection(db, 'educational_institutions'));
  try {
    if (payload.id) {
      await updateDoc(instRef, {
        name: payload.name.trim(),
        institution_code: payload.institution_code?.trim() || null,
        commune_id: payload.commune_id || null,
        responsible_name: payload.responsible_name.trim(),
        badge_level: payload.badge_level,
        is_verified: payload.is_verified,
        updated_at: serverTimestamp(),
      });
    } else {
      await setDoc(instRef, {
        id: instRef.id,
        name: payload.name.trim(),
        institution_code: payload.institution_code?.trim() || null,
        commune_id: payload.commune_id || null,
        responsible_name: payload.responsible_name.trim(),
        badge_level: payload.badge_level,
        is_verified: payload.is_verified,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    }
    const snap = await getDoc(instRef);
    const d = snap.data()!;
    return {
      id: snap.id,
      name: String(d.name || ''),
      institution_code: d.institution_code ? String(d.institution_code) : null,
      commune_id: d.commune_id ? String(d.commune_id) : null,
      sector_id: null,
      responsible_name: String(d.responsible_name || ''),
      badge_level: d.badge_level as InstitutionBadge,
      is_verified: Boolean(d.is_verified),
      created_at: toIsoString(d.created_at),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `educational_institutions/${instRef.id}`);
  }
}

export async function createReport(params: {
  reporterId: string;
  targetType: ReportRecord['target_type'];
  targetId: string;
  reasonCategory: string;
  description: string;
}): Promise<void> {
  const reportRef = doc(collection(db, 'reports'));
  try {
    await setDoc(reportRef, {
      id: reportRef.id,
      reporter_id: params.reporterId,
      target_type: params.targetType,
      target_id: params.targetId,
      reason_category: params.reasonCategory,
      description: params.description.trim(),
      status: 'open',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `reports/${reportRef.id}`);
  }
}

export async function listReportsAdmin(): Promise<ReportRecord[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'reports'), orderBy('created_at', 'desc'))
    );
    if (snap.empty) return [];
    const reporterIds = snap.docs.map((d) => String(d.data().reporter_id || ''));
    const profiles = await fetchProfilesMap(reporterIds);

    return snap.docs.map((d) => {
      const data = d.data();
      const rep = profiles.get(String(data.reporter_id || ''));
      return {
        id: d.id,
        reporter_id: String(data.reporter_id || ''),
        target_type: data.target_type,
        target_id: String(data.target_id || ''),
        reason_category: String(data.reason_category || ''),
        description: String(data.description || ''),
        status: data.status,
        resolution_notes: data.resolution_notes ? String(data.resolution_notes) : null,
        resolved_by: data.resolved_by ? String(data.resolved_by) : null,
        resolved_at: toNullableIsoString(data.resolved_at),
        created_at: toIsoString(data.created_at),
        reporter: rep
          ? { id: rep.id, full_name: rep.full_name, username: rep.username }
          : null,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'reports');
  }
}

export async function resolveReportRpc(
  reportId: string,
  status: 'under_review' | 'resolved' | 'dismissed',
  resolutionNotes: string
): Promise<ReportRecord> {
  const actorUid = auth.currentUser?.uid;
  if (!actorUid) throw new Error('Sesión requerida.');
  const reportRef = doc(db, 'reports', reportId);

  try {
    const batch = writeBatch(db);
    batch.update(reportRef, {
      status,
      resolution_notes: resolutionNotes.trim(),
      resolved_by: actorUid,
      resolved_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    const logRef = doc(collection(db, 'moderation_logs'));
    batch.set(logRef, {
      id: logRef.id,
      actor_id: actorUid,
      target_type: 'report',
      target_id: reportId,
      action: `report_${status}`,
      new_status: status,
      notes: resolutionNotes.trim(),
      created_at: serverTimestamp(),
    });
    await batch.commit();

    const snap = await getDoc(reportRef);
    const d = snap.data()!;
    return {
      id: snap.id,
      reporter_id: String(d.reporter_id || ''),
      target_type: d.target_type,
      target_id: String(d.target_id || ''),
      reason_category: String(d.reason_category || ''),
      description: String(d.description || ''),
      status,
      resolution_notes: resolutionNotes.trim(),
      resolved_by: actorUid,
      resolved_at: new Date().toISOString(),
      created_at: toIsoString(d.created_at),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`);
  }
}
