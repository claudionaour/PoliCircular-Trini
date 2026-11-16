import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bookmark, Flag, Gift, RefreshCw, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getProductById, listMyProducts } from '../../services/productService';
import { createMatchRequest, upsertProductInterest } from '../../services/matchingService';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import { OsmSectorMap } from '../../components/OsmSectorMap';
import { ReportModal } from '../../components/ReportModal';
import { CONDITION_LABELS, formatChileDate, MODALITY_LABELS } from '../../utils/formatters';
import type { Product } from '../../types/domain';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [myApprovedProducts, setMyApprovedProducts] = useState<Product[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [offeredProductId, setOfferedProductId] = useState('');
  const [requestedQuantity, setRequestedQuantity] = useState(1);
  const [requestMessage, setRequestMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getProductById(id)
      .then((p) => setProduct(p))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user) return;
    listMyProducts(user.uid)
      .then((items) => {
        const approved = items.filter((p) => p.status === 'approved' && p.available_quantity > 0);
        setMyApprovedProducts(approved);
      })
      .catch(() => setMyApprovedProducts([]));
  }, [user]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !product) {
      navigate('/iniciar-sesion');
      return;
    }
    setSubmitting(true);
    setStatusMsg(null);
    try {
      await upsertProductInterest(product.id, user.uid, 'interested');
      await createMatchRequest({
        targetProductId: product.id,
        requesterId: user.uid,
        ownerId: product.owner_id,
        modality: product.modality,
        offeredProductId: product.modality === 'exchange' ? offeredProductId || null : null,
        requestedQuantity,
        message: requestMessage,
      });
      setStatusMsg({
        type: 'ok',
        text: 'Solicitud enviada. Cuando el propietario acepte, se creará el Match y el chat privado.',
      });
      setRequestMessage('');
    } catch (err) {
      setStatusMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'No fue posible enviar la solicitud.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="max-w-5xl mx-auto p-6 text-sm text-slate-200">Cargando publicación...</div>;
  }

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-[#102C49] rounded-2xl border border-[#244B73] text-center space-y-3">
        <p className="font-display font-bold text-white">Publicación no disponible</p>
        <Link to="/explorar" className="text-sm font-semibold text-[#FFA94D] hover:underline">
          Volver a Explorar
        </Link>
      </div>
    );
  }

  const images = [...(product.product_images ?? [])].sort((a, b) =>
    a.is_primary === b.is_primary ? a.sort_order - b.sort_order : a.is_primary ? -1 : 1
  );
  const currentImg = images[activePhotoIndex]?.public_url;
  const isOwner = user?.uid === product.owner_id;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Link
        to="/explorar"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-200 hover:text-[#FFA94D]"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Volver al catálogo</span>
      </Link>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Galería + Mapa aproximado */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl overflow-hidden border border-[#244B73] bg-[#081626] aspect-[4/3]">
            <ImageWithFallback
              src={currentImg}
              alt={product.title}
              fallbackTitle={product.title}
              className="w-full h-full object-cover"
            />
          </div>

          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`h-16 w-20 rounded-xl overflow-hidden border shrink-0 ${
                    idx === activePhotoIndex ? 'border-[#FFA94D] ring-2 ring-[#FFA94D]/40' : 'border-[#244B73]'
                  }`}
                >
                  <ImageWithFallback src={img.public_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <OsmSectorMap
            latitude={product.sectors?.approx_lat ?? product.communes?.latitude}
            longitude={product.sectors?.approx_lng ?? product.communes?.longitude}
            label={`Sector aproximado: ${product.sectors?.name || product.communes?.name}`}
            heightClass="h-56"
          />
        </div>

        {/* Detalles y Solicitud */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl bg-[#102C49] border border-[#244B73] p-6 space-y-4">
            <div className="text-xs text-slate-300">
              <span
                className={`font-semibold ${
                  product.modality === 'gift' ? 'text-[#6EE7B7]' : 'text-[#FFA94D]'
                }`}
              >
                {MODALITY_LABELS[product.modality]}
              </span>
              <span aria-hidden="true"> · </span>
              <span>{product.categories?.name}</span>
              <span aria-hidden="true"> · </span>
              <span>{CONDITION_LABELS[product.condition]}</span>
            </div>

            <h1 className="font-display text-2xl font-bold text-white">{product.title}</h1>

            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>

            {product.modality === 'exchange' && product.desired_exchange_items && (
              <div className="rounded-xl bg-[#2A2015] border border-[#F28C28]/40 p-3.5 text-xs text-[#FDE68A]">
                <strong>Busca intercambiar por:</strong> {product.desired_exchange_items}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#244B73] text-xs">
              <div>
                <span className="text-slate-300 block">Disponibilidad</span>
                <span className="font-semibold text-white tabular-nums">
                  {product.available_quantity} de {product.total_quantity} unidad(es)
                </span>
              </div>
              <div>
                <span className="text-slate-300 block">Entrega sugerida</span>
                <span className="font-semibold text-white">{product.delivery_method}</span>
              </div>
              <div>
                <span className="text-slate-300 block">Comuna y sector</span>
                <span className="font-semibold text-white">
                  {product.communes?.name}
                  {product.sectors ? ` · ${product.sectors.name}` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-300 block">Publicado</span>
                <span className="font-semibold text-white">{formatChileDate(product.created_at)}</span>
              </div>
            </div>

            {/* Oferente */}
            <div className="pt-3 border-t border-[#244B73] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl overflow-hidden bg-[#081626] border border-[#244B73]">
                  <ImageWithFallback
                    src={product.profiles?.avatar_url}
                    alt={product.profiles?.full_name || 'Oferente'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {product.profiles?.institution_name || product.profiles?.full_name}
                  </p>
                  <p className="text-xs text-slate-300 flex items-center gap-1 tabular-nums">
                    <Star className="h-3.5 w-3.5 text-[#FFA94D] fill-[#FFA94D]" />
                    <span>
                      {Number(product.profiles?.reputation_avg ?? 0).toFixed(1)} (
                      {product.profiles?.reputation_count ?? 0} reseñas)
                    </span>
                  </p>
                </div>
              </div>

              {user && !isOwner && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => upsertProductInterest(product.id, user.uid, 'favorite')}
                    className="p-2 rounded-xl border border-[#3B648F] bg-[#0B1E33] text-slate-200 hover:text-[#FFA94D]"
                    aria-label="Guardar favorito"
                  >
                    <Bookmark className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReport(true)}
                    className="p-2 rounded-xl border border-[#3B648F] bg-[#0B1E33] text-slate-200 hover:text-red-300"
                    aria-label="Denunciar publicación"
                  >
                    <Flag className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Formulario de solicitud / intercambio */}
          {!isOwner && product.status === 'approved' && product.available_quantity > 0 && (
            <form
              onSubmit={handleRequestSubmit}
              className="rounded-2xl bg-[#102C49] border border-[#244B73] p-6 space-y-4"
            >
              <div className="flex items-center gap-2 font-display font-bold text-base text-white">
                {product.modality === 'gift' ? (
                  <>
                    <Gift className="h-5 w-5 text-[#6EE7B7]" />
                    <span>Me interesa este regalo</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-5 w-5 text-[#FFA94D]" />
                    <span>Proponer intercambio</span>
                  </>
                )}
              </div>

              {product.available_quantity > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    Unidades solicitadas
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={product.available_quantity}
                    value={requestedQuantity}
                    onChange={(e) => setRequestedQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white px-3 py-2 text-sm font-mono tabular-nums"
                  />
                </div>
              )}

              {product.modality === 'exchange' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    Asociar uno de tus productos aprobados (opcional)
                  </label>
                  <select
                    value={offeredProductId}
                    onChange={(e) => setOfferedProductId(e.target.value)}
                    className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white px-3 py-2.5 text-sm"
                  >
                    <option value="">Acordar producto directamente por chat</option>
                    {myApprovedProducts.map((mp) => (
                      <option key={mp.id} value={mp.id}>
                        {mp.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Mensaje para {product.profiles?.full_name}
                </label>
                <textarea
                  rows={3}
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Cuéntale por qué te sirve este objeto o qué propones para coordinar."
                  className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white placeholder:text-slate-400 px-3 py-2 text-sm"
                />
              </div>

              {statusMsg && (
                <div
                  className={`rounded-xl p-3 text-xs ${
                    statusMsg.type === 'ok'
                      ? 'bg-[#143D29] border border-[#34D399]/35 text-[#6EE7B7]'
                      : 'bg-red-950/70 text-red-200 border border-red-400/40'
                  }`}
                >
                  {statusMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-[#F28C28] py-3 text-sm font-bold text-[#0B1E33] hover:bg-[#FFA242] transition-colors disabled:opacity-50 min-h-[44px]"
              >
                {submitting
                  ? 'Enviando solicitud...'
                  : product.modality === 'gift'
                    ? 'Enviar solicitud de regalo'
                    : 'Enviar propuesta de intercambio'}
              </button>
            </form>
          )}
        </div>
      </div>

      {showReport && (
        <ReportModal
          targetType="product"
          targetId={product.id}
          targetTitle={product.title}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};
