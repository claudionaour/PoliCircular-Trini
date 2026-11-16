import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from 'firebase/auth';
import {
  Timestamp,
  doc,
  getDocFromServer,
  getFirestore,
} from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

export const isFirebaseConfigured = Boolean(
  firebaseConfig?.apiKey &&
    firebaseConfig?.projectId &&
    firebaseConfig?.firestoreDatabaseId
);

export const ENABLE_CLOUD_FUNCTIONS =
  import.meta.env.VITE_ENABLE_CLOUD_FUNCTIONS === 'true';

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('No se pudo fijar browserLocalPersistence en Firebase Auth:', err);
});

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);
storage.maxUploadRetryTime = 3000;
export const functions = getFunctions(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let connectionTested = false;

export async function testFirestoreConnection(): Promise<void> {
  if (connectionTested) return;
  connectionTested = true;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Por favor revisa la configuración de Firebase Firestore.');
    }
  }
}

export function toIsoString(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

export function toNullableIsoString(val: unknown): string | null {
  if (!val) return null;
  return toIsoString(val);
}

export function translateFirebaseError(err: unknown): string {
  if (!(err instanceof Error)) return 'Ocurrió un error inesperado.';
  const raw = err.message;
  try {
    const parsed = JSON.parse(raw) as FirestoreErrorInfo;
    if (parsed?.error) {
      if (parsed.error.includes('permission-denied') || parsed.error.includes('Missing or insufficient permissions')) {
        return 'No tienes permisos suficientes o falta verificar tu correo electrónico para realizar esta acción.';
      }
      return parsed.error;
    }
  } catch {
    // No es JSON de FirestoreErrorInfo
  }

  if (raw.includes('auth/email-already-in-use')) {
    return 'Ya existe una cuenta registrada con ese correo electrónico.';
  }
  if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password') || raw.includes('auth/user-not-found')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (raw.includes('auth/weak-password')) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (raw.includes('auth/too-many-requests')) {
    return 'Demasiados intentos seguidos. Espera unos minutos antes de volver a intentar.';
  }
  if (raw.includes('auth/popup-closed-by-user') || raw.includes('auth/cancelled-popup-request')) {
    return 'Se cerró la ventana de acceso con Google antes de completar el inicio de sesión.';
  }
  if (raw.includes('auth/popup-blocked')) {
    return 'El navegador bloqueó la ventana emergente de Google. Permite ventanas emergentes para este sitio e inténtalo nuevamente.';
  }
  if (raw.includes('auth/unauthorized-domain')) {
    return 'Este dominio aún no está autorizado en Firebase Authentication. Recarga o revisa la configuración de Firebase.';
  }
  if (raw.includes('auth/network-request-failed')) {
    return 'Error de red al conectar con Firebase. Verifica tu conexión e inténtalo nuevamente.';
  }
  if (raw.includes('auth/operation-not-allowed')) {
    return 'El acceso con correo y contraseña aún no está habilitado en Firebase Authentication. Puedes iniciar con Google o habilitar Email/Password en Firebase Console.';
  }
  return raw;
}
