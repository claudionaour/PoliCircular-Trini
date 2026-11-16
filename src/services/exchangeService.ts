import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
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
  ExchangeConfirmation,
  ExchangeRecord,
  MatchRecord,
  Product,
  ProductModality,
  Review,
  TreeStage,
} from '../types/domain';

function computeTreeStage(operations: number): TreeStage {
  if (operations >= 15) return 'arbol_frutal';
  if (operations >= 9) return 'arbol_desarrollado';
  if (operations >= 5) return 'arbol_joven';
  if (operations >= 2) return 'brote';
  return 'semilla';
}

export async function listUserExchanges(userId: string): Promise<ExchangeRecord[]> {
  try {
    const [asOwnerSnap, asRequesterSnap] = await Promise.all([
      getDocs(query(collection(db, 'exchanges'), where('owner_id', '==', userId))),
      getDocs(query(collection(db, 'exchanges'), where('requester_id', '==', userId))),
    ]);

    const exMap = new Map<string, (typeof asOwnerSnap.docs)[number]>();
    asOwnerSnap.docs.forEach((d) => exMap.set(d.id, d));
    asRequesterSnap.docs.forEach((d) => exMap.set(d.id, d));
    if (exMap.size === 0) return [];

    const exDocs = Array.from(exMap.values());
    const matchIds = Array.from(
      new Set(exDocs.map((d) => String(d.data().match_id || '')).filter(Boolean))
    );

    const matchSnaps = await Promise.all(
      matchIds.map((mid) => getDoc(doc(db, 'matches', mid)).catch(() => null))
    );
    const productIds: string[] = [];
    const userIds: string[] = [];
    matchSnaps.forEach((mSnap) => {
      if (!mSnap?.exists()) return;
      const md = mSnap.data();
      if (md.target_product_id) productIds.push(String(md.target_product_id));
      if (md.offered_product_id) productIds.push(String(md.offered_product_id));
      if (md.owner_id) userIds.push(String(md.owner_id));
      if (md.requester_id) userIds.push(String(md.requester_id));
    });

    const [maps, profiles, images, productSnaps, confSnaps] = await Promise.all([
      fetchLookupMaps(),
      fetchProfilesMap(userIds),
      fetchImagesByProductIds(productIds),
      Promise.all(
        Array.from(new Set(productIds)).map((pid) =>
          getDoc(doc(db, 'products', pid)).catch(() => null)
        )
      ),
      Promise.all(
        exDocs.map((eDoc) =>
          getDocs(
            query(collection(db, 'exchange_confirmations'), where('exchange_id', '==', eDoc.id))
          ).catch(() => null)
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

    const matchMap = new Map<string, MatchRecord>();
    matchSnaps.forEach((mSnap) => {
      if (!mSnap?.exists()) return;
      const md = mSnap.data();
      matchMap.set(mSnap.id, {
        id: mSnap.id,
        request_id: String(md.request_id || ''),
        target_product_id: String(md.target_product_id || ''),
        offered_product_id: md.offered_product_id ? String(md.offered_product_id) : null,
        owner_id: String(md.owner_id || ''),
        requester_id: String(md.requester_id || ''),
        modality: md.modality as ProductModality,
        quantity_reserved: Number(md.quantity_reserved ?? 1),
        status: md.status,
        created_at: toIsoString(md.created_at),
        target_product: productMap.get(String(md.target_product_id || '')) ?? null,
        offered_product: md.offered_product_id
          ? productMap.get(String(md.offered_product_id)) ?? null
          : null,
        owner: profiles.get(String(md.owner_id || '')) ?? null,
        requester: profiles.get(String(md.requester_id || '')) ?? null,
      });
    });

    const confByExchange = new Map<string, ExchangeConfirmation[]>();
    confSnaps.forEach((snap, idx) => {
      const exId = exDocs[idx].id;
      const list =
        snap?.docs.map((c) => {
          const cd = c.data();
          return {
            id: c.id,
            exchange_id: String(cd.exchange_id || exId),
            user_id: String(cd.user_id || ''),
            confirmed_at: toIsoString(cd.confirmed_at),
            notes: cd.notes ? String(cd.notes) : null,
          };
        }) ?? [];
      confByExchange.set(exId, list);
    });

    return exDocs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          match_id: String(data.match_id || ''),
          status: data.status,
          proposed_date: data.proposed_date ? String(data.proposed_date) : null,
          proposed_time_slot: data.proposed_time_slot ? String(data.proposed_time_slot) : null,
          meeting_point_label: data.meeting_point_label
            ? String(data.meeting_point_label)
            : null,
          meeting_point_lat:
            typeof data.meeting_point_lat === 'number' ? data.meeting_point_lat : null,
          meeting_point_lng:
            typeof data.meeting_point_lng === 'number' ? data.meeting_point_lng : null,
          proposed_by: data.proposed_by ? String(data.proposed_by) : null,
          cancelled_by: data.cancelled_by ? String(data.cancelled_by) : null,
          cancellation_reason: data.cancellation_reason
            ? String(data.cancellation_reason)
            : null,
          completed_at: toNullableIsoString(data.completed_at),
          created_at: toIsoString(data.created_at),
          matches: matchMap.get(String(data.match_id || '')) ?? null,
          exchange_confirmations: confByExchange.get(d.id) ?? [],
        } satisfies ExchangeRecord;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'exchanges');
  }
}

export async function proposeExchangeDelivery(params: {
  exchangeId: string;
  proposedBy: string;
  proposedDate: string;
  proposedTimeSlot: string;
  meetingPointLabel: string;
  meetingPointLat?: number | null;
  meetingPointLng?: number | null;
  agreed?: boolean;
}): Promise<void> {
  try {
    await updateDoc(doc(db, 'exchanges', params.exchangeId), {
      proposed_by: params.proposedBy,
      proposed_date: params.proposedDate,
      proposed_time_slot: params.proposedTimeSlot,
      meeting_point_label: params.meetingPointLabel.trim(),
      meeting_point_lat: params.meetingPointLat ?? null,
      meeting_point_lng: params.meetingPointLng ?? null,
      status: params.agreed ? 'delivery_agreed' : 'coordinating',
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `exchanges/${params.exchangeId}`);
  }
}

export async function confirmExchangeDeliveryRpc(params: {
  exchangeId: string;
  notes?: string;
  measuredWeightKg?: number | null;
}): Promise<ExchangeRecord> {
  if (ENABLE_CLOUD_FUNCTIONS) {
    const fn = httpsCallable(functions, 'confirmExchangeDelivery');
    await fn(params);
    const snap = await getDoc(doc(db, 'exchanges', params.exchangeId));
    return { id: snap.id, ...(snap.data() as Omit<ExchangeRecord, 'id'>) };
  }

  const currentUid = auth.currentUser?.uid;
  if (!currentUid) throw new Error('Debes iniciar sesión.');

  const exchangeRef = doc(db, 'exchanges', params.exchangeId);

  // Pre-cargar catálogo de logros fuera de la tx (las reglas validan exists en achievements)
  const achievementsSnap = await getDocs(collection(db, 'achievements'));

  try {
    const finalStatus = await runTransaction(db, async (tx) => {
      // 1. TODAS LAS LECTURAS ANTES DE CUALQUIER ESCRITURA
      const exSnap = await tx.get(exchangeRef);
      if (!exSnap.exists()) throw new Error('Intercambio no encontrado.');
      const ex = exSnap.data();

      if (ex.owner_id !== currentUid && ex.requester_id !== currentUid) {
        throw new Error('No perteneces a este intercambio.');
      }
      if (['completed', 'cancelled'].includes(ex.status)) {
        throw new Error('Este intercambio ya finalizó.');
      }

      const myConfId = `${params.exchangeId}_${currentUid}`;
      const myConfRef = doc(db, 'exchange_confirmations', myConfId);
      const myConfSnap = await tx.get(myConfRef);
      if (myConfSnap.exists()) {
        throw new Error('Ya registraste tu confirmación de entrega.');
      }

      const otherUid = ex.owner_id === currentUid ? String(ex.requester_id) : String(ex.owner_id);
      const otherConfRef = doc(db, 'exchange_confirmations', `${params.exchangeId}_${otherUid}`);
      const otherConfSnap = await tx.get(otherConfRef);
      const bilateralCompleted = otherConfSnap.exists();

      if (!bilateralCompleted) {
        // 2a. Confirmación unilateral -> queda esperando a la contraparte
        tx.set(myConfRef, {
          id: myConfId,
          exchange_id: params.exchangeId,
          user_id: currentUid,
          owner_id: ex.owner_id,
          requester_id: ex.requester_id,
          confirmed_at: serverTimestamp(),
          notes: params.notes?.trim() || null,
          measured_weight_kg:
            typeof params.measuredWeightKg === 'number' ? params.measuredWeightKg : null,
        });

        tx.update(exchangeRef, {
          status: 'delivered_pending_confirm',
          updated_at: serverTimestamp(),
        });

        const notifRef = doc(collection(db, 'notifications'));
        tx.set(notifRef, {
          id: notifRef.id,
          user_id: otherUid,
          event_type: 'exchange_half_confirmed',
          title: 'Tu contraparte confirmó la entrega',
          body: 'Ingresa a Intercambios para confirmar la recepción y hacer crecer tu Árbol Circular.',
          link_path: '/intercambios',
          is_read: false,
          created_at: serverTimestamp(),
        });

        return 'delivered_pending_confirm' as const;
      }

      // 2b. Lecturas adicionales para cierre bilateral completo
      const matchRef = doc(db, 'matches', String(ex.match_id));
      const matchSnap = await tx.get(matchRef);
      if (!matchSnap.exists()) throw new Error('Match asociado no encontrado.');
      const match = matchSnap.data();

      const productRef = doc(db, 'products', String(match.target_product_id));
      const productSnap = await tx.get(productRef);
      if (!productSnap.exists()) throw new Error('Publicación asociada no encontrada.');
      const product = productSnap.data();

      const catSnap = await tx.get(doc(db, 'categories', String(product.category_id)));
      const catWeight = catSnap.exists() ? Number(catSnap.data().estimated_weight_kg ?? 1) : 1;

      const ownerTreeRef = doc(db, 'user_tree_progress', String(ex.owner_id));
      const requesterTreeRef = doc(db, 'user_tree_progress', String(ex.requester_id));
      const [ownerTreeSnap, requesterTreeSnap] = await Promise.all([
        tx.get(ownerTreeRef),
        tx.get(requesterTreeRef),
      ]);

      // Verificar qué logros aún no están desbloqueados para evitar sobrescrituras prohibidas
      const isGift = match.modality === 'gift';
      const participantUpdates = [
        { uid: String(ex.owner_id), snap: ownerTreeSnap },
        { uid: String(ex.requester_id), snap: requesterTreeSnap },
      ].map((p) => {
        const prev = p.snap.exists()
          ? p.snap.data()
          : { completed_operations: 0, completed_gifts: 0, completed_exchanges: 0 };
        const nextOps = Number(prev.completed_operations ?? 0) + 1;
        return {
          uid: p.uid,
          exists: p.snap.exists(),
          nextOps,
          nextGifts: Number(prev.completed_gifts ?? 0) + (isGift ? 1 : 0),
          nextEx: Number(prev.completed_exchanges ?? 0) + (isGift ? 0 : 1),
        };
      });

      const unlockedToCreate: { recId: string; uid: string; achId: string }[] = [];
      for (const p of participantUpdates) {
        for (const achDoc of achievementsSnap.docs) {
          const reqOps = Number(achDoc.data().required_operations ?? 1);
          if (p.nextOps >= reqOps) {
            const recId = `${p.uid}_${achDoc.id}`;
            const existingUa = await tx.get(doc(db, 'user_achievements', recId));
            if (!existingUa.exists()) {
              unlockedToCreate.push({ recId, uid: p.uid, achId: achDoc.id });
            }
          }
        }
      }

      // ESCRITURAS ATÓMICAS DE CIERRE BILATERAL
      tx.set(myConfRef, {
        id: myConfId,
        exchange_id: params.exchangeId,
        user_id: currentUid,
        owner_id: ex.owner_id,
        requester_id: ex.requester_id,
        confirmed_at: serverTimestamp(),
        notes: params.notes?.trim() || null,
        measured_weight_kg:
          typeof params.measuredWeightKg === 'number' ? params.measuredWeightKg : null,
      });

      tx.update(exchangeRef, {
        status: 'completed',
        completed_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      tx.update(matchRef, {
        status: 'completed',
        updated_at: serverTimestamp(),
      });

      const qtyReserved = Number(match.quantity_reserved ?? 1);
      const nextReserved = Math.max(0, Number(product.reserved_quantity ?? 0) - qtyReserved);
      const nextProdStatus =
        Number(product.available_quantity ?? 0) === 0 && nextReserved === 0
          ? 'completed'
          : product.status;

      tx.update(productRef, {
        reserved_quantity: nextReserved,
        status: nextProdStatus,
        sync_exchange_id: params.exchangeId,
        updated_at: serverTimestamp(),
      });

      for (const p of participantUpdates) {
        tx.set(doc(db, 'user_tree_progress', p.uid), {
          user_id: p.uid,
          completed_operations: p.nextOps,
          completed_gifts: p.nextGifts,
          completed_exchanges: p.nextEx,
          current_stage: computeTreeStage(p.nextOps),
          last_exchange_id: params.exchangeId,
          updated_at: serverTimestamp(),
        });
      }

      for (const ua of unlockedToCreate) {
        tx.set(doc(db, 'user_achievements', ua.recId), {
          id: ua.recId,
          user_id: ua.uid,
          achievement_id: ua.achId,
          exchange_id: params.exchangeId,
          unlocked_at: serverTimestamp(),
        });
      }

      const measured =
        typeof params.measuredWeightKg === 'number' && params.measuredWeightKg > 0
          ? params.measuredWeightKg
          : Number(otherConfSnap.data().measured_weight_kg || 0);
      const totalWeight =
        measured > 0 ? measured : Number((catWeight * qtyReserved).toFixed(2));

      tx.set(doc(db, 'impact_records', params.exchangeId), {
        id: params.exchangeId,
        exchange_id: params.exchangeId,
        product_id: String(product.id),
        category_id: String(product.category_id),
        commune_id: String(product.commune_id),
        sector_id: product.sector_id ? String(product.sector_id) : null,
        modality: match.modality,
        quantity: qtyReserved,
        weight_kg: totalWeight,
        weight_type: measured > 0 ? 'measured' : 'estimated',
        created_at: serverTimestamp(),
      });

      const notifRef = doc(collection(db, 'notifications'));
      tx.set(notifRef, {
        id: notifRef.id,
        user_id: otherUid,
        event_type: 'exchange_completed',
        title: '¡Entrega circular completada!',
        body: 'Ambos confirmaron la entrega. Tu Árbol Circular creció y ya puedes dejar una reseña.',
        link_path: '/mi-arbol',
        is_read: false,
        created_at: serverTimestamp(),
      });

      return 'completed' as const;
    });

    const updatedSnap = await getDoc(exchangeRef);
    return {
      id: updatedSnap.id,
      match_id: String(updatedSnap.data()?.match_id || ''),
      status: finalStatus,
      proposed_date: null,
      proposed_time_slot: null,
      meeting_point_label: null,
      meeting_point_lat: null,
      meeting_point_lng: null,
      proposed_by: null,
      cancelled_by: null,
      cancellation_reason: null,
      completed_at: finalStatus === 'completed' ? new Date().toISOString() : null,
      created_at: toIsoString(updatedSnap.data()?.created_at),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `exchanges/${params.exchangeId}`);
  }
}

export async function cancelExchangeAgreementRpc(
  exchangeId: string,
  reason: string
): Promise<ExchangeRecord> {
  if (ENABLE_CLOUD_FUNCTIONS) {
    const fn = httpsCallable(functions, 'cancelExchangeAgreement');
    await fn({ exchangeId, reason });
    const snap = await getDoc(doc(db, 'exchanges', exchangeId));
    return { id: snap.id, ...(snap.data() as Omit<ExchangeRecord, 'id'>) };
  }

  const currentUid = auth.currentUser?.uid;
  if (!currentUid) throw new Error('Debes iniciar sesión.');

  const exRef = doc(db, 'exchanges', exchangeId);

  try {
    await runTransaction(db, async (tx) => {
      const exSnap = await tx.get(exRef);
      if (!exSnap.exists()) throw new Error('Intercambio no encontrado.');
      const ex = exSnap.data();

      if (ex.owner_id !== currentUid && ex.requester_id !== currentUid) {
        throw new Error('No tienes permiso para cancelar este intercambio.');
      }
      if (['completed', 'cancelled'].includes(ex.status)) {
        throw new Error('No se puede cancelar este estado.');
      }

      const matchRef = doc(db, 'matches', String(ex.match_id));
      const matchSnap = await tx.get(matchRef);
      if (!matchSnap.exists()) throw new Error('Match no encontrado.');
      const match = matchSnap.data();

      const productRef = doc(db, 'products', String(match.target_product_id));
      const productSnap = await tx.get(productRef);
      if (!productSnap.exists()) throw new Error('Producto no encontrado.');
      const product = productSnap.data();

      const qtyReserved = Number(match.quantity_reserved ?? 1);

      tx.update(exRef, {
        status: 'cancelled',
        cancelled_by: currentUid,
        cancellation_reason: reason.trim() || 'Cancelado por participante',
        updated_at: serverTimestamp(),
      });

      tx.update(matchRef, {
        status: 'cancelled',
        updated_at: serverTimestamp(),
      });

      tx.update(productRef, {
        available_quantity: Number(product.available_quantity ?? 0) + qtyReserved,
        reserved_quantity: Math.max(0, Number(product.reserved_quantity ?? 0) - qtyReserved),
        status: 'approved',
        sync_exchange_id: exchangeId,
        updated_at: serverTimestamp(),
      });

      const otherUid = ex.owner_id === currentUid ? String(ex.requester_id) : String(ex.owner_id);
      const notifRef = doc(collection(db, 'notifications'));
      tx.set(notifRef, {
        id: notifRef.id,
        user_id: otherUid,
        event_type: 'exchange_cancelled',
        title: 'Acuerdo de entrega cancelado',
        body: 'La contraparte canceló el acuerdo y el stock volvió al catálogo.',
        link_path: '/intercambios',
        is_read: false,
        created_at: serverTimestamp(),
      });
    });

    const updatedSnap = await getDoc(exRef);
    const d = updatedSnap.data()!;
    return {
      id: updatedSnap.id,
      match_id: String(d.match_id || ''),
      status: 'cancelled',
      proposed_date: d.proposed_date ? String(d.proposed_date) : null,
      proposed_time_slot: d.proposed_time_slot ? String(d.proposed_time_slot) : null,
      meeting_point_label: d.meeting_point_label ? String(d.meeting_point_label) : null,
      meeting_point_lat: typeof d.meeting_point_lat === 'number' ? d.meeting_point_lat : null,
      meeting_point_lng: typeof d.meeting_point_lng === 'number' ? d.meeting_point_lng : null,
      proposed_by: d.proposed_by ? String(d.proposed_by) : null,
      cancelled_by: currentUid,
      cancellation_reason: reason.trim(),
      completed_at: null,
      created_at: toIsoString(d.created_at),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `exchanges/${exchangeId}`);
  }
}

export async function markExchangeDispute(exchangeId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'exchanges', exchangeId), {
      status: 'disputed',
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `exchanges/${exchangeId}`);
  }
}

export async function submitExchangeReviewRpc(params: {
  exchangeId: string;
  compliance: number;
  punctuality: number;
  condition: number;
  communication: number;
  respect: number;
  comment?: string;
}): Promise<Review> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) throw new Error('Debes iniciar sesión.');

  const reviewId = `${params.exchangeId}_${currentUid}`;
  const overall = Number(
    (
      (params.compliance +
        params.punctuality +
        params.condition +
        params.communication +
        params.respect) /
      5
    ).toFixed(2)
  );

  try {
    const reviewedUserId = await runTransaction(db, async (tx) => {
      const exSnap = await tx.get(doc(db, 'exchanges', params.exchangeId));
      if (!exSnap.exists()) throw new Error('Intercambio no encontrado.');
      const ex = exSnap.data();

      if (ex.status !== 'completed') {
        throw new Error('Solo puedes reseñar un intercambio completado bilateralmente.');
      }
      if (ex.owner_id !== currentUid && ex.requester_id !== currentUid) {
        throw new Error('No perteneces a este intercambio.');
      }

      const targetUid =
        ex.owner_id === currentUid ? String(ex.requester_id) : String(ex.owner_id);
      const targetUserRef = doc(db, 'users', targetUid);
      const targetUserSnap = await tx.get(targetUserRef);
      if (!targetUserSnap.exists()) throw new Error('Usuario evaluado no encontrado.');

      const existingRev = await tx.get(doc(db, 'reviews', reviewId));
      if (existingRev.exists()) {
        throw new Error('Ya enviaste una reseña para este intercambio.');
      }

      const uData = targetUserSnap.data();
      const prevCount = Number(uData.reputation_count ?? 0);
      const prevAvg = Number(uData.reputation_avg ?? 0);
      const nextCount = prevCount + 1;
      const nextAvg = Number(((prevAvg * prevCount + overall) / nextCount).toFixed(2));

      tx.set(doc(db, 'reviews', reviewId), {
        id: reviewId,
        exchange_id: params.exchangeId,
        reviewer_id: currentUid,
        reviewed_user_id: targetUid,
        rating_compliance: params.compliance,
        rating_punctuality: params.punctuality,
        rating_condition: params.condition,
        rating_communication: params.communication,
        rating_respect: params.respect,
        overall_rating: overall,
        comment: params.comment?.trim() || null,
        is_flagged: false,
        created_at: serverTimestamp(),
      });

      tx.update(targetUserRef, {
        reputation_avg: nextAvg,
        reputation_count: nextCount,
        last_review_id: reviewId,
        updated_at: serverTimestamp(),
      });

      return targetUid;
    });

    return {
      id: reviewId,
      exchange_id: params.exchangeId,
      reviewer_id: currentUid,
      reviewed_user_id: reviewedUserId,
      rating_compliance: params.compliance,
      rating_punctuality: params.punctuality,
      rating_condition: params.condition,
      rating_communication: params.communication,
      rating_respect: params.respect,
      overall_rating: overall,
      comment: params.comment?.trim() || null,
      is_flagged: false,
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `reviews/${reviewId}`);
  }
}

export async function listUserReviews(userId: string): Promise<Review[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'reviews'), where('is_flagged', '==', false))
    );
    const matchedDocs = snap.docs.filter(
      (d) => String(d.data().reviewed_user_id || '') === userId
    );
    if (matchedDocs.length === 0) return [];

    const reviewerIds = matchedDocs.map((d) => String(d.data().reviewer_id || ''));
    const profiles = await fetchProfilesMap(reviewerIds);

    return matchedDocs
      .map((d) => {
        const data = d.data();
        const prof = profiles.get(String(data.reviewer_id || ''));
        return {
          id: d.id,
          exchange_id: String(data.exchange_id || ''),
          reviewer_id: String(data.reviewer_id || ''),
          reviewed_user_id: String(data.reviewed_user_id || ''),
          rating_compliance: Number(data.rating_compliance ?? 5),
          rating_punctuality: Number(data.rating_punctuality ?? 5),
          rating_condition: Number(data.rating_condition ?? 5),
          rating_communication: Number(data.rating_communication ?? 5),
          rating_respect: Number(data.rating_respect ?? 5),
          overall_rating: Number(data.overall_rating ?? 5),
          comment: data.comment ? String(data.comment) : null,
          is_flagged: Boolean(data.is_flagged),
          created_at: toIsoString(data.created_at),
          reviewer: prof
            ? {
                id: prof.id,
                full_name: prof.full_name,
                username: prof.username,
                avatar_url: prof.avatar_url,
              }
            : null,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'reviews');
  }
}

export async function listMySubmittedReviewExchangeIds(userId: string): Promise<string[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'reviews'), where('reviewer_id', '==', userId))
    );
    return snap.docs.map((d) => String(d.data().exchange_id || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'reviews');
  }
}
