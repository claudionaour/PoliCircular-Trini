import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, toIsoString, toNullableIsoString } from './firebase';
import type { AppNotification } from '../types/domain';

function mapNotification(id: string, d: Record<string, unknown>): AppNotification {
  return {
    id,
    user_id: String(d.user_id || ''),
    event_type: String(d.event_type || ''),
    title: String(d.title || ''),
    body: String(d.body || ''),
    link_path: d.link_path ? String(d.link_path) : null,
    is_read: Boolean(d.is_read),
    read_at: toNullableIsoString(d.read_at),
    created_at: toIsoString(d.created_at),
  };
}

export async function listNotifications(userId: string): Promise<AppNotification[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'notifications'), where('user_id', '==', userId))
    );
    return snap.docs
      .map((d) => mapNotification(d.id, d.data()))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 60);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'notifications');
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      is_read: true,
      read_at: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    const snap = await getDocs(
      query(collection(db, 'notifications'), where('user_id', '==', userId))
    );
    const unreadDocs = snap.docs.filter((d) => !d.data().is_read);
    if (unreadDocs.length === 0) return;
    const batch = writeBatch(db);
    unreadDocs.forEach((d) => {
      batch.update(d.ref, {
        is_read: true,
        read_at: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'notifications');
  }
}

export function subscribeUserNotifications(
  userId: string,
  onNewNotification: (notif: AppNotification) => void
): { unsubscribe: () => void } {
  const q = query(collection(db, 'notifications'), where('user_id', '==', userId));

  const unsub = onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          onNewNotification(mapNotification(change.doc.id, change.doc.data()));
        }
      });
    },
    (error) => {
      console.error('Error en notificaciones Firestore:', error);
    }
  );

  return { unsubscribe: unsub };
}
