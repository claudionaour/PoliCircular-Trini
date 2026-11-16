import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
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
} from './firestoreHelpers';
import type {
  Conversation,
  ExchangeConfirmation,
  ExchangeRecord,
  InterestDecision,
  MatchRecord,
  MatchRequest,
  Product,
  ProductModality,
} from '../types/domain';

export async function upsertProductInterest(
  productId: string,
  userId: string,
  decision: InterestDecision
): Promise<void> {
  const docId = `${userId}_${productId}`;
  try {
    await setDoc(doc(db, 'product_interests', docId), {
      id: docId,
      product_id: productId,
      user_id: userId,
      decision,
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `product_interests/${docId}`);
  }
}

export async function listUserInterests(userId: string) {
  try {
    const snap = await getDocs(
      query(collection(db, 'product_interests'), where('user_id', '==', userId))
    );
    if (snap.empty) return [];

    const maps = await fetchLookupMaps();
    const productIds = snap.docs.map((d) => String(d.data().product_id || ''));
    const productSnaps = await Promise.all(
      Array.from(new Set(productIds)).map((pid) =>
        getDoc(doc(db, 'products', pid)).catch(() => null)
      )
    );
    const images = await fetchImagesByProductIds(productIds);
    const ownerIds = productSnaps
      .filter((s): s is NonNullable<typeof s> => Boolean(s?.exists()))
      .map((s) => String(s.data()!.owner_id || ''));
    const profiles = await fetchProfilesMap(ownerIds);

    const productMap = new Map<string, Product>();
    productSnaps.forEach((pSnap) => {
      if (pSnap?.exists()) {
        productMap.set(
          pSnap.id,
          hydrateProductDoc(pSnap.id, pSnap.data(), { ...maps, profiles, images })
        );
      }
    });

    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          product_id: String(data.product_id || ''),
          user_id: String(data.user_id || ''),
          decision: data.decision as InterestDecision,
          updated_at: toIsoString(data.updated_at),
          products: productMap.get(String(data.product_id || '')) ?? null,
        };
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'product_interests');
  }
}

export async function createMatchRequest(params: {
  targetProductId: string;
  requesterId: string;
  ownerId: string;
  modality: ProductModality;
  offeredProductId?: string | null;
  requestedQuantity: number;
  message?: string;
}): Promise<MatchRequest> {
  const reqRef = doc(collection(db, 'match_requests'));
  const notifRef = doc(collection(db, 'notifications'));

  try {
    const batch = writeBatch(db);
    batch.set(reqRef, {
      id: reqRef.id,
      target_product_id: params.targetProductId,
      requester_id: params.requesterId,
      owner_id: params.ownerId,
      modality: params.modality,
      offered_product_id:
        params.modality === 'exchange' ? params.offeredProductId || null : null,
      requested_quantity: params.requestedQuantity,
      message: params.message?.trim() || null,
      status: 'pending',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    batch.set(notifRef, {
      id: notifRef.id,
      user_id: params.ownerId,
      event_type: 'match_request_received',
      title: 'Nueva solicitud circular',
      body:
        params.modality === 'gift'
          ? 'Un vecino solicitó uno de tus regalos publicados.'
          : 'Un vecino propuso un intercambio por tu publicación.',
      link_path: '/matches',
      is_read: false,
      created_at: serverTimestamp(),
    });

    await batch.commit();

    return {
      id: reqRef.id,
      target_product_id: params.targetProductId,
      requester_id: params.requesterId,
      owner_id: params.ownerId,
      modality: params.modality,
      offered_product_id:
        params.modality === 'exchange' ? params.offeredProductId || null : null,
      requested_quantity: params.requestedQuantity,
      message: params.message?.trim() || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `match_requests/${reqRef.id}`);
  }
}

export async function listMatchRequests(userId: string): Promise<MatchRequest[]> {
  try {
    const [asOwnerSnap, asRequesterSnap] = await Promise.all([
      getDocs(query(collection(db, 'match_requests'), where('owner_id', '==', userId))),
      getDocs(query(collection(db, 'match_requests'), where('requester_id', '==', userId))),
    ]);

    const docMap = new Map<string, (typeof asOwnerSnap.docs)[number]>();
    asOwnerSnap.docs.forEach((d) => docMap.set(d.id, d));
    asRequesterSnap.docs.forEach((d) => docMap.set(d.id, d));
    if (docMap.size === 0) return [];

    const docs = Array.from(docMap.values());
    const productIds: string[] = [];
    const userIds: string[] = [];
    docs.forEach((d) => {
      const data = d.data();
      if (data.target_product_id) productIds.push(String(data.target_product_id));
      if (data.offered_product_id) productIds.push(String(data.offered_product_id));
      if (data.requester_id) userIds.push(String(data.requester_id));
      if (data.owner_id) userIds.push(String(data.owner_id));
    });

    const [maps, profiles, images, productSnaps] = await Promise.all([
      fetchLookupMaps(),
      fetchProfilesMap(userIds),
      fetchImagesByProductIds(productIds),
      Promise.all(
        Array.from(new Set(productIds)).map((pid) =>
          getDoc(doc(db, 'products', pid)).catch(() => null)
        )
      ),
    ]);

    const productMap = new Map<string, Product>();
    productSnaps.forEach((pSnap) => {
      if (pSnap?.exists()) {
        productMap.set(
          pSnap.id,
          hydrateProductDoc(pSnap.id, pSnap.data(), { ...maps, profiles, images })
        );
      }
    });

    return docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          target_product_id: String(data.target_product_id || ''),
          requester_id: String(data.requester_id || ''),
          owner_id: String(data.owner_id || ''),
          modality: data.modality as ProductModality,
          offered_product_id: data.offered_product_id ? String(data.offered_product_id) : null,
          requested_quantity: Number(data.requested_quantity ?? 1),
          message: data.message ? String(data.message) : null,
          status: data.status,
          created_at: toIsoString(data.created_at),
          target_product: productMap.get(String(data.target_product_id || '')) ?? null,
          offered_product: data.offered_product_id
            ? productMap.get(String(data.offered_product_id)) ?? null
            : null,
          requester: profiles.get(String(data.requester_id || '')) ?? null,
          owner: profiles.get(String(data.owner_id || '')) ?? null,
        } satisfies MatchRequest;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'match_requests');
  }
}

export async function acceptMatchRequestRpc(requestId: string): Promise<string> {
  if (ENABLE_CLOUD_FUNCTIONS) {
    const fn = httpsCallable<{ requestId: string }, { matchId: string }>(
      functions,
      'acceptMatchRequest'
    );
    const res = await fn({ requestId });
    return res.data.matchId;
  }

  const currentUid = auth.currentUser?.uid;
  if (!currentUid) throw new Error('Debes iniciar sesión.');

  const reqRef = doc(db, 'match_requests', requestId);

  try {
    return await runTransaction(db, async (tx) => {
      const reqSnap = await tx.get(reqRef);
      if (!reqSnap.exists()) throw new Error('Solicitud no encontrada.');
      const reqData = reqSnap.data();

      if (reqData.owner_id !== currentUid) {
        throw new Error('Solo quien publicó el producto puede aceptar la solicitud.');
      }
      if (!['pending', 'chat_requested'].includes(reqData.status)) {
        throw new Error('La solicitud ya fue procesada.');
      }

      const productRef = doc(db, 'products', String(reqData.target_product_id));
      const productSnap = await tx.get(productRef);
      if (!productSnap.exists()) throw new Error('Publicación no encontrada.');
      const prod = productSnap.data();

      const qty = Number(reqData.requested_quantity ?? 1);
      if (prod.status !== 'approved' || Number(prod.available_quantity) < qty) {
        throw new Error('No queda suficiente cantidad disponible para reservar.');
      }

      const nextAvailable = Number(prod.available_quantity) - qty;
      const nextReserved = Number(prod.reserved_quantity) + qty;

      const matchRef = doc(collection(db, 'matches'));
      const convRef = doc(collection(db, 'conversations'));
      const exchangeRef = doc(collection(db, 'exchanges'));
      const notifRef = doc(collection(db, 'notifications'));

      tx.update(reqRef, {
        status: 'accepted',
        updated_at: serverTimestamp(),
      });

      tx.update(productRef, {
        available_quantity: nextAvailable,
        reserved_quantity: nextReserved,
        status: nextAvailable === 0 ? 'reserved' : 'approved',
        updated_at: serverTimestamp(),
      });

      tx.set(matchRef, {
        id: matchRef.id,
        request_id: requestId,
        target_product_id: reqData.target_product_id,
        offered_product_id: reqData.offered_product_id || null,
        owner_id: reqData.owner_id,
        requester_id: reqData.requester_id,
        modality: reqData.modality,
        quantity_reserved: qty,
        status: 'active',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      tx.set(convRef, {
        id: convRef.id,
        match_id: matchRef.id,
        participant_a: reqData.owner_id,
        participant_b: reqData.requester_id,
        is_blocked: false,
        blocked_by: null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      tx.set(exchangeRef, {
        id: exchangeRef.id,
        match_id: matchRef.id,
        owner_id: reqData.owner_id,
        requester_id: reqData.requester_id,
        status: 'pending',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      tx.set(notifRef, {
        id: notifRef.id,
        user_id: reqData.requester_id,
        event_type: 'match_accepted',
        title: '¡Tienes un nuevo Match Circular!',
        body: `Aceptaron tu solicitud por “${prod.title}”. Ya puedes coordinar la entrega.`,
        link_path: `/matches/${matchRef.id}`,
        is_read: false,
        created_at: serverTimestamp(),
      });

      return matchRef.id;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `match_requests/${requestId}`);
  }
}

export async function updateMatchRequestStatus(
  requestId: string,
  status: 'rejected' | 'cancelled' | 'chat_requested'
): Promise<void> {
  try {
    await updateDoc(doc(db, 'match_requests', requestId), {
      status,
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `match_requests/${requestId}`);
  }
}

async function hydrateMatchDocs(
  matchDocs: { id: string; data: () => Record<string, unknown> }[]
): Promise<MatchRecord[]> {
  if (matchDocs.length === 0) return [];

  const productIds: string[] = [];
  const userIds: string[] = [];
  const matchIds: string[] = [];

  matchDocs.forEach((d) => {
    const data = d.data();
    matchIds.push(d.id);
    if (data.target_product_id) productIds.push(String(data.target_product_id));
    if (data.offered_product_id) productIds.push(String(data.offered_product_id));
    if (data.owner_id) userIds.push(String(data.owner_id));
    if (data.requester_id) userIds.push(String(data.requester_id));
  });

  const [maps, profiles, images, productSnaps, convSnaps, exSnaps] = await Promise.all([
    fetchLookupMaps(),
    fetchProfilesMap(userIds),
    fetchImagesByProductIds(productIds),
    Promise.all(
      Array.from(new Set(productIds)).map((pid) =>
        getDoc(doc(db, 'products', pid)).catch(() => null)
      )
    ),
    Promise.all(
      matchIds.map((mid) =>
        getDocs(query(collection(db, 'conversations'), where('match_id', '==', mid))).catch(
          () => null
        )
      )
    ),
    Promise.all(
      matchIds.map((mid) =>
        getDocs(query(collection(db, 'exchanges'), where('match_id', '==', mid))).catch(
          () => null
        )
      )
    ),
  ]);

  const productMap = new Map<string, Product>();
  productSnaps.forEach((pSnap) => {
    if (pSnap?.exists()) {
      productMap.set(
        pSnap.id,
        hydrateProductDoc(pSnap.id, pSnap.data(), { ...maps, profiles, images })
      );
    }
  });

  const convByMatch = new Map<string, Conversation[]>();
  convSnaps.forEach((snap) => {
    snap?.docs.forEach((cDoc) => {
      const d = cDoc.data();
      const mid = String(d.match_id || '');
      const list = convByMatch.get(mid) ?? [];
      list.push({
        id: cDoc.id,
        match_id: mid,
        participant_a: String(d.participant_a || ''),
        participant_b: String(d.participant_b || ''),
        is_blocked: Boolean(d.is_blocked),
        blocked_by: d.blocked_by ? String(d.blocked_by) : null,
        created_at: toIsoString(d.created_at),
      });
      convByMatch.set(mid, list);
    });
  });

  const allExchangeIds: string[] = [];
  const exByMatch = new Map<string, ExchangeRecord[]>();
  exSnaps.forEach((snap) => {
    snap?.docs.forEach((eDoc) => {
      const d = eDoc.data();
      const mid = String(d.match_id || '');
      allExchangeIds.push(eDoc.id);
      const list = exByMatch.get(mid) ?? [];
      list.push({
        id: eDoc.id,
        match_id: mid,
        status: d.status,
        proposed_date: d.proposed_date ? String(d.proposed_date) : null,
        proposed_time_slot: d.proposed_time_slot ? String(d.proposed_time_slot) : null,
        meeting_point_label: d.meeting_point_label ? String(d.meeting_point_label) : null,
        meeting_point_lat: typeof d.meeting_point_lat === 'number' ? d.meeting_point_lat : null,
        meeting_point_lng: typeof d.meeting_point_lng === 'number' ? d.meeting_point_lng : null,
        proposed_by: d.proposed_by ? String(d.proposed_by) : null,
        cancelled_by: d.cancelled_by ? String(d.cancelled_by) : null,
        cancellation_reason: d.cancellation_reason ? String(d.cancellation_reason) : null,
        completed_at: toNullableIsoString(d.completed_at),
        created_at: toIsoString(d.created_at),
        exchange_confirmations: [],
      });
      exByMatch.set(mid, list);
    });
  });

  const confByEx = new Map<string, ExchangeConfirmation[]>();
  await Promise.all(
    allExchangeIds.map(async (exId) => {
      const cSnap = await getDocs(
        query(collection(db, 'exchange_confirmations'), where('exchange_id', '==', exId))
      ).catch(() => null);
      if (!cSnap) return;
      confByEx.set(
        exId,
        cSnap.docs.map((c) => {
          const cd = c.data();
          return {
            id: c.id,
            exchange_id: String(cd.exchange_id || exId),
            user_id: String(cd.user_id || ''),
            confirmed_at: toIsoString(cd.confirmed_at),
            notes: cd.notes ? String(cd.notes) : null,
          };
        })
      );
    })
  );

  exByMatch.forEach((list) => {
    list.forEach((ex) => {
      ex.exchange_confirmations = confByEx.get(ex.id) ?? [];
    });
  });

  return matchDocs
    .map((mDoc) => {
      const d = mDoc.data();
      return {
        id: mDoc.id,
        request_id: String(d.request_id || ''),
        target_product_id: String(d.target_product_id || ''),
        offered_product_id: d.offered_product_id ? String(d.offered_product_id) : null,
        owner_id: String(d.owner_id || ''),
        requester_id: String(d.requester_id || ''),
        modality: d.modality as ProductModality,
        quantity_reserved: Number(d.quantity_reserved ?? 1),
        status: d.status as MatchRecord['status'],
        created_at: toIsoString(d.created_at),
        target_product: productMap.get(String(d.target_product_id || '')) ?? null,
        offered_product: d.offered_product_id
          ? productMap.get(String(d.offered_product_id)) ?? null
          : null,
        owner: profiles.get(String(d.owner_id || '')) ?? null,
        requester: profiles.get(String(d.requester_id || '')) ?? null,
        conversations: convByMatch.get(mDoc.id) ?? [],
        exchanges: exByMatch.get(mDoc.id) ?? [],
      } satisfies MatchRecord;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function listUserMatches(userId: string): Promise<MatchRecord[]> {
  try {
    const [asOwnerSnap, asRequesterSnap] = await Promise.all([
      getDocs(query(collection(db, 'matches'), where('owner_id', '==', userId))),
      getDocs(query(collection(db, 'matches'), where('requester_id', '==', userId))),
    ]);

    const docMap = new Map<string, (typeof asOwnerSnap.docs)[number]>();
    asOwnerSnap.docs.forEach((d) => docMap.set(d.id, d));
    asRequesterSnap.docs.forEach((d) => docMap.set(d.id, d));
    return hydrateMatchDocs(Array.from(docMap.values()));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'matches');
  }
}

export async function getMatchDetail(matchId: string): Promise<MatchRecord | null> {
  try {
    const snap = await getDoc(doc(db, 'matches', matchId));
    if (!snap.exists()) return null;
    const hydrated = await hydrateMatchDocs([snap]);
    return hydrated[0] ?? null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `matches/${matchId}`);
  }
}
