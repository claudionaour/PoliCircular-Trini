import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { app, db } from './firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

export async function isPushMessagingSupported(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

export async function registerUserPushToken(userId: string): Promise<string | null> {
  if (!VAPID_KEY) return null;
  const supported = await isPushMessagingSupported();
  if (!supported) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return null;

    await setDoc(
      doc(db, 'users', userId, 'private', 'contact'),
      {
        user_id: userId,
        fcm_token: token,
        updated_at: serverTimestamp(),
      },
      { merge: true }
    );
    return token;
  } catch (err) {
    console.warn('No se pudo registrar Firebase Cloud Messaging:', err);
    return null;
  }
}

export async function listenForegroundPushMessages(
  onPayload: (title: string, body: string) => void
): Promise<() => void> {
  const supported = await isPushMessagingSupported();
  if (!supported || !VAPID_KEY) return () => {};
  try {
    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      const title = payload.notification?.title || 'PoliCircular';
      const body = payload.notification?.body || 'Tienes una nueva actualización circular.';
      onPayload(title, body);
    });
  } catch {
    return () => {};
  }
}
