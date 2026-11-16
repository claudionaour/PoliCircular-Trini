import { Capacitor } from '@capacitor/core';
import {
  GoogleAuthProvider,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  ENABLE_CLOUD_FUNCTIONS,
  auth,
  db,
  functions,
  handleFirestoreError,
  OperationType,
  storage,
  toIsoString,
} from './firebase';
import { mapProfileDoc } from './firestoreHelpers';
import type { AccountType, PrivateContact, Profile, UserRole } from '../types/domain';

import { fileToCompactDataUrl } from '../utils/imageOptimizer';

const BOOTSTRAP_SUPER_ADMIN_EMAILS = new Set([
  'claudionaourlopez@gmail.com',
  'naourclaudio@gmail.com',
]);

const bootstrapInFlight = new Map<string, Promise<void>>();

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  username: string;
  communeId: string;
  sectorId?: string;
  accountType: AccountType;
  institutionName?: string;
  institutionDescription?: string;
  responsiblePerson?: string;
  institutionalCode?: string;
  privatePhone?: string;
  isMinorSupervised?: boolean;
  guardianAuthorizationNote?: string;
}

async function resolveTerritorialLabels(communeId?: string | null, sectorId?: string | null) {
  let communeName: string | null = null;
  let communeRegion: string | null = null;
  let sectorName: string | null = null;

  if (communeId) {
    const cSnap = await getDoc(doc(db, 'communes', communeId)).catch(() => null);
    if (cSnap?.exists()) {
      communeName = String(cSnap.data().name || '');
      communeRegion = String(cSnap.data().region || '');
    }
  }
  if (sectorId) {
    const sSnap = await getDoc(doc(db, 'sectors', sectorId)).catch(() => null);
    if (sSnap?.exists()) {
      sectorName = String(sSnap.data().name || '');
    }
  }
  return { communeName, communeRegion, sectorName };
}

export async function initializeUserDocuments(
  firebaseUser: User,
  details: {
    fullName: string;
    username: string;
    communeId?: string | null;
    sectorId?: string | null;
    accountType?: AccountType;
    institutionName?: string;
    institutionDescription?: string;
    responsiblePerson?: string;
    institutionalCode?: string;
    privatePhone?: string;
    isMinorSupervised?: boolean;
    guardianAuthorizationNote?: string;
  }
): Promise<void> {
  const uid = firebaseUser.uid;
  const userRef = doc(db, 'users', uid);
  const existing = await getDoc(userRef);
  if (existing.exists()) return;

  const { communeName, communeRegion, sectorName } = await resolveTerritorialLabels(
    details.communeId,
    details.sectorId
  );

  const normalizedUsername = details.username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.\-]/g, '_')
    .slice(0, 50);

  const safeUsername =
    normalizedUsername.length >= 3
      ? normalizedUsername
      : `vecino_${uid.slice(0, 6)}`;

  const batch = writeBatch(db);
  batch.set(userRef, {
    id: uid,
    full_name: details.fullName.trim() || 'Participante PoliCircular',
    username: safeUsername,
    avatar_url: firebaseUser.photoURL || null,
    bio: null,
    commune_id: details.communeId || 'castro',
    commune_name: communeName || 'Castro',
    commune_region: communeRegion || 'Región de Los Lagos',
    sector_id: details.sectorId || null,
    sector_name: sectorName || null,
    account_type: details.accountType || 'individual',
    institution_id: null,
    institution_name: details.institutionName?.trim() || null,
    institution_description: details.institutionDescription?.trim() || null,
    responsible_person: details.responsiblePerson?.trim() || null,
    institutional_code: details.institutionalCode?.trim() || null,
    is_minor_supervised: Boolean(details.isMinorSupervised),
    guardian_authorization_note: details.guardianAuthorizationNote?.trim() || null,
    is_suspended: false,
    suspension_reason: null,
    reputation_avg: 0,
    reputation_count: 0,
    terms_accepted_at: serverTimestamp(),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  batch.set(doc(db, 'users', uid, 'private', 'contact'), {
    user_id: uid,
    private_email: firebaseUser.email || null,
    private_phone: details.privatePhone?.trim() || null,
    updated_at: serverTimestamp(),
  });

  batch.set(doc(db, 'user_tree_progress', uid), {
    user_id: uid,
    completed_operations: 0,
    completed_gifts: 0,
    completed_exchanges: 0,
    current_stage: 'semilla',
    updated_at: serverTimestamp(),
  });

  await batch.commit();
}

const PUBLIC_WEB_ORIGIN = 'https://ais-pre-dj7zeddnfchgopwqeu36fl-839173396062.us-east1.run.app';

function getAuthContinueOrigin(): string {
  if (Capacitor.isNativePlatform()) {
    return PUBLIC_WEB_ORIGIN;
  }
  return window.location.origin;
}

export async function registerUser(payload: RegisterPayload) {
  const credential = await createUserWithEmailAndPassword(
    auth,
    payload.email.trim(),
    payload.password
  );
  const firebaseUser = credential.user;

  await updateProfile(firebaseUser, {
    displayName: payload.fullName.trim(),
  });

  await initializeUserDocuments(firebaseUser, {
    fullName: payload.fullName,
    username: payload.username,
    communeId: payload.communeId,
    sectorId: payload.sectorId,
    accountType: payload.accountType,
    institutionName: payload.institutionName,
    institutionDescription: payload.institutionDescription,
    responsiblePerson: payload.responsiblePerson,
    institutionalCode: payload.institutionalCode,
    privatePhone: payload.privatePhone,
    isMinorSupervised: payload.isMinorSupervised,
    guardianAuthorizationNote: payload.guardianAuthorizationNote,
  });

  await sendEmailVerification(firebaseUser, {
    url: `${getAuthContinueOrigin()}/iniciar-sesion`,
  });

  return { user: firebaseUser };
}

export async function signInUser(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  if (!credential.user.emailVerified) {
    throw new Error(
      'Tu correo aún no ha sido verificado. Revisa tu bandeja de entrada o reenvía el correo de verificación.'
    );
  }
  await ensureBootstrapProfile(credential.user);
  return { user: credential.user };
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  await ensureBootstrapProfile(result.user);
  return result.user;
}

export async function ensureBootstrapProfile(firebaseUser: User): Promise<void> {
  const existingPromise = bootstrapInFlight.get(firebaseUser.uid);
  if (existingPromise) {
    return existingPromise;
  }

  const task = (async () => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const emailPrefix = (firebaseUser.email || 'vecino').split('@')[0];
      await initializeUserDocuments(firebaseUser, {
        fullName: firebaseUser.displayName || emailPrefix,
        username: `${emailPrefix}_${firebaseUser.uid.slice(0, 4)}`,
        communeId: 'castro',
        accountType: 'individual',
      });
    }
  })();

  bootstrapInFlight.set(firebaseUser.uid, task);
  try {
    await task;
  } finally {
    bootstrapInFlight.delete(firebaseUser.uid);
  }
}

export async function resendVerificationEmail(): Promise<void> {
  const current = auth.currentUser;
  if (!current) {
    throw new Error('Inicia sesión primero para reenviar el correo de verificación.');
  }
  await sendEmailVerification(current, {
    url: `${getAuthContinueOrigin()}/iniciar-sesion`,
  });
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function sendPasswordRecovery(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim(), {
    url: `${getAuthContinueOrigin()}/restablecer-contrasena`,
  });
}

export async function confirmPasswordResetWithCode(
  oobCode: string,
  newPassword: string
): Promise<void> {
  await confirmPasswordReset(auth, oobCode, newPassword);
}

export async function updateUserPassword(newPassword: string): Promise<void> {
  const current = auth.currentUser;
  if (!current) throw new Error('No hay una sesión activa.');
  await updatePassword(current, newPassword);
}

export async function fetchUserProfile(userId: string): Promise<Profile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) return null;
    const profile = mapProfileDoc(snap.id, snap.data());

    if (profile.commune_id && !profile.communes) {
      const cSnap = await getDoc(doc(db, 'communes', profile.commune_id)).catch(() => null);
      if (cSnap?.exists()) {
        profile.communes = {
          id: cSnap.id,
          name: String(cSnap.data().name || ''),
          region: String(cSnap.data().region || ''),
        };
      }
    }
    if (profile.sector_id && !profile.sectors) {
      const sSnap = await getDoc(doc(db, 'sectors', profile.sector_id)).catch(() => null);
      if (sSnap?.exists()) {
        profile.sectors = {
          id: sSnap.id,
          name: String(sSnap.data().name || ''),
          approx_lat: typeof sSnap.data().approx_lat === 'number' ? sSnap.data().approx_lat : null,
          approx_lng: typeof sSnap.data().approx_lng === 'number' ? sSnap.data().approx_lng : null,
        };
      }
    }

    return profile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
  }
}

export async function fetchUserRoles(
  userId: string,
  email?: string | null
): Promise<UserRole[]> {
  if (email && BOOTSTRAP_SUPER_ADMIN_EMAILS.has(email.toLowerCase())) {
    return ['user', 'moderator', 'admin', 'super_admin'];
  }
  try {
    const snap = await getDoc(doc(db, 'user_roles', userId));
    if (!snap.exists()) return ['user'];
    const roles = (snap.data().roles as UserRole[] | undefined) || ['user'];
    return roles.length > 0 ? roles : ['user'];
  } catch {
    return ['user'];
  }
}

export async function fetchPrivateContact(userId: string): Promise<PrivateContact | null> {
  try {
    const snap = await getDoc(doc(db, 'users', userId, 'private', 'contact'));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      user_id: userId,
      private_email: d.private_email ? String(d.private_email) : null,
      private_phone: d.private_phone ? String(d.private_phone) : null,
      updated_at: toIsoString(d.updated_at),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/private/contact`);
  }
}

export async function updateOwnProfile(
  userId: string,
  updates: Partial<{
    full_name: string;
    bio: string | null;
    commune_id: string | null;
    sector_id: string | null;
    avatar_url: string | null;
    institution_name: string | null;
    institution_description: string | null;
    responsible_person: string | null;
    institutional_code: string | null;
  }>,
  privatePhone?: string | null
): Promise<void> {
  const territorial =
    updates.commune_id !== undefined || updates.sector_id !== undefined
      ? await resolveTerritorialLabels(updates.commune_id, updates.sector_id)
      : null;

  const payload: Record<string, unknown> = {
    ...updates,
    updated_at: serverTimestamp(),
  };

  if (territorial) {
    if (updates.commune_id !== undefined) {
      payload.commune_name = territorial.communeName;
      payload.commune_region = territorial.communeRegion;
    }
    if (updates.sector_id !== undefined) {
      payload.sector_name = territorial.sectorName;
    }
  }

  try {
    await updateDoc(doc(db, 'users', userId), payload);

    if (privatePhone !== undefined) {
      await setDoc(
        doc(db, 'users', userId, 'private', 'contact'),
        {
          user_id: userId,
          private_phone: privatePhone || null,
          updated_at: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

export async function uploadAvatarImage(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'webp';
  const filePath = `avatars/${userId}/avatar_${Date.now()}.${ext}`;
  const fileRef = ref(storage, filePath);
  try {
    await Promise.race([
      uploadBytes(fileRef, file, {
        contentType: file.type || 'image/webp',
        cacheControl: 'public,max-age=3600',
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Storage timeout')), 3500)
      ),
    ]);
    return await getDownloadURL(fileRef);
  } catch {
    return fileToCompactDataUrl(file, 256, 80_000);
  }
}

export async function deleteOwnAccount(): Promise<void> {
  const current = auth.currentUser;
  if (!current) return;

  if (ENABLE_CLOUD_FUNCTIONS) {
    const fn = httpsCallable(functions, 'deleteOwnAccount');
    await fn();
    await signOut(auth);
    return;
  }

  await updateDoc(doc(db, 'users', current.uid), {
    is_suspended: true,
    suspension_reason: 'Cuenta eliminada por el usuario',
    updated_at: serverTimestamp(),
  });
  await deleteDoc(doc(db, 'users', current.uid, 'private', 'contact')).catch(() => {});

  try {
    await deleteUser(current);
  } catch {
    // Si Firebase exige reautenticación reciente, cerramos la sesión tras desactivar el perfil
    await signOut(auth);
  }
}
