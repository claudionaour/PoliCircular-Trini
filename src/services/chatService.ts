import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, toIsoString, toNullableIsoString } from './firebase';
import type { Conversation, Message } from '../types/domain';

function mapMessage(id: string, d: Record<string, unknown>): Message {
  return {
    id,
    conversation_id: String(d.conversation_id || ''),
    sender_id: String(d.sender_id || ''),
    body: String(d.body || ''),
    is_read: Boolean(d.is_read),
    read_at: toNullableIsoString(d.read_at),
    created_at: toIsoString(d.created_at),
  };
}

export async function getConversationByMatch(matchId: string): Promise<Conversation | null> {
  try {
    const snap = await getDocs(
      query(collection(db, 'conversations'), where('match_id', '==', matchId))
    );
    if (snap.empty) return null;
    const cDoc = snap.docs[0];
    const d = cDoc.data();
    return {
      id: cDoc.id,
      match_id: String(d.match_id || matchId),
      participant_a: String(d.participant_a || ''),
      participant_b: String(d.participant_b || ''),
      is_blocked: Boolean(d.is_blocked),
      blocked_by: d.blocked_by ? String(d.blocked_by) : null,
      created_at: toIsoString(d.created_at),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'conversations');
  }
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'messages'), where('conversation_id', '==', conversationId))
    );
    return snap.docs
      .map((d) => mapMessage(d.id, d.data()))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'messages');
  }
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string
): Promise<Message> {
  const convSnap = await getDoc(doc(db, 'conversations', conversationId));
  if (!convSnap.exists()) {
    throw new Error('No se encontró la conversación del match.');
  }
  const conv = convSnap.data();
  if (conv.is_blocked) {
    throw new Error('Esta conversación está bloqueada.');
  }

  const msgRef = doc(collection(db, 'messages'));
  const cleanBody = body.trim();

  try {
    await setDoc(msgRef, {
      id: msgRef.id,
      conversation_id: conversationId,
      participant_a: String(conv.participant_a),
      participant_b: String(conv.participant_b),
      sender_id: senderId,
      body: cleanBody,
      is_read: false,
      created_at: serverTimestamp(),
    });

    return {
      id: msgRef.id,
      conversation_id: conversationId,
      sender_id: senderId,
      body: cleanBody,
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `messages/${msgRef.id}`);
  }
}

export async function markConversationMessagesRead(
  conversationId: string,
  currentUserId: string
): Promise<void> {
  try {
    const snap = await getDocs(
      query(collection(db, 'messages'), where('conversation_id', '==', conversationId))
    );
    const unreadFromOther = snap.docs.filter(
      (d) => !d.data().is_read && d.data().sender_id !== currentUserId
    );
    if (unreadFromOther.length === 0) return;

    const batch = writeBatch(db);
    unreadFromOther.forEach((d) => {
      batch.update(d.ref, {
        is_read: true,
        read_at: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'messages');
  }
}

export async function toggleConversationBlock(
  conversationId: string,
  userId: string,
  block: boolean
): Promise<void> {
  try {
    await updateDoc(doc(db, 'conversations', conversationId), {
      is_blocked: block,
      blocked_by: block ? userId : null,
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `conversations/${conversationId}`);
  }
}

export function subscribeToConversationMessages(
  conversationId: string,
  onInsert: (msg: Message) => void,
  onUpdate: (msg: Message) => void
): { unsubscribe: () => void } {
  const q = query(
    collection(db, 'messages'),
    where('conversation_id', '==', conversationId)
  );

  const unsub = onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const msg = mapMessage(change.doc.id, change.doc.data());
        if (change.type === 'added') onInsert(msg);
        if (change.type === 'modified') onUpdate(msg);
      });
    },
    (error) => {
      console.error('Error en suscripción de chat Firestore:', error);
    }
  );

  return { unsubscribe: unsub };
}
