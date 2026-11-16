import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, PlusCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { archiveOwnProduct, listMyProducts } from '../../services/productService';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import {
  CONDITION_LABELS,
  formatChileDate,
  MODALITY_LABELS,
  PRODUCT_STATUS_LABELS,
} from '../../utils/formatters';
import type { Product } from '../../types/domain';

export const MyProductsPage: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await listMyProducts(user.uid);
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando publicaciones.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleArchive = async (id: string) => {
    try {
      await archiveOwnProduct(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo archivar.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Mis publicaciones</h1>
          <p className="text-sm text-slate-200">
            Revisa el estado de moderación y unidades disponibles de tus productos.
          </p>
        </div>
        <Link
          to="/publicar"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F28C28] text-[#0B1E33] text-sm font-bold hover:bg-[#FFA242] whitespace-nowrap"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Publicar nuevo</span>
        </Link>
      </div>

      {error && (
        <div className="rounded-xl bg-red-950/70 border border-red-400/40 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-64 rounded-2xl bg-[#102C49] border border-[#244B73] animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl bg-[#102C49] border border-[#244B73] p-10 text-center space-y-3">
          <h2 className="font-display text-lg font-bold text-white">
            Aún no has publicado productos
          </h2>
          <p className="text-sm text-slate-200 max-w-md mx-auto">
            Publica objetos útiles para regalar o intercambiar. Cada publicación pasa por revisión comunitaria antes de quedar visible.
          </p>
          <Link
            to="/publicar"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F28C28] text-[#0B1E33] text-sm font-bold"
          >
            Publicar mi primer producto
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((product) => {
            const primaryImg =
              product.product_images?.find((img) => img.is_primary)?.public_url ||
              product.product_images?.[0]?.public_url;

            return (
              <article
                key={product.id}
                className="rounded-2xl bg-[#102C49] border border-[#244B73] overflow-hidden flex flex-col"
              >
                <div className="h-44 bg-[#081626]">
                  <ImageWithFallback
                    src={primaryImg}
                    alt={product.title}
                    fallbackTitle={product.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-slate-300">
                      <span
                        className={`font-semibold ${
                          product.status === 'approved'
                            ? 'text-[#6EE7B7]'
                            : product.status === 'rejected' || product.status === 'suspended'
                              ? 'text-red-300'
                              : 'text-[#FFA94D]'
                        }`}
                      >
                        {PRODUCT_STATUS_LABELS[product.status]}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span>{MODALITY_LABELS[product.modality]}</span>
                    </div>
                    <h3 className="font-display font-bold text-base text-white line-clamp-1">
                      {product.title}
                    </h3>
                    <p className="text-xs text-slate-200 line-clamp-2">{product.description}</p>
                    <p className="text-xs text-slate-300 tabular-nums">
                      {CONDITION_LABELS[product.condition]} · Disp: {product.available_quantity}/
                      {product.total_quantity} · {formatChileDate(product.created_at)}
                    </p>
                    {product.moderation_notes && (
                      <p className="text-xs bg-[#0B1E33] border border-[#244B73] p-2.5 rounded-xl text-slate-200">
                        <strong className="text-[#FFA94D]">Observación:</strong> {product.moderation_notes}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#244B73] flex items-center justify-between gap-2">
                    <Link
                      to={`/producto/${product.id}`}
                      className="text-xs font-semibold text-[#FFA94D] hover:underline"
                    >
                      Ver detalle
                    </Link>
                    {['pending', 'approved', 'rejected'].includes(product.status) && (
                      <button
                        type="button"
                        onClick={() => handleArchive(product.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-red-300"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        <span>Archivar</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
