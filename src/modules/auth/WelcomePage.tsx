import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Compass, Gift, RefreshCw, ShieldCheck, Trees } from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import { PWAInstallButton } from '../../components/PWAInstallButton';
import { useAuth } from '../../context/AuthContext';
import heroCastroImg from '../../assets/images/hero_castro_circular_1794851579501.jpg';
import showcaseObjectsImg from '../../assets/images/circular_objects_showcase_1794851579551.jpg';

export const WelcomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="bg-[#0B1E33]">
      {/* Hero 2-Column Editorial Split */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-12 lg:pt-14 lg:pb-16">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <BrandLogo size="lg" />
                <PWAInstallButton />
              </div>

              <h1
                className="font-display font-bold tracking-tight text-white leading-[1.1]"
                style={{ fontSize: 'clamp(2.1rem, 3.8vw, 3.25rem)', textWrap: 'balance' }}
              >
                Lo que ya no necesitas puede ser lo que alguien está buscando
              </h1>

              <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-xl">
                PoliCircular es la plataforma comunitaria y educativa de economía circular nacida en Castro, Chiloé. Conecta vecinos, familias, escuelas y organizaciones para regalar e intercambiar productos en desuso sin utilizar dinero.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {user ? (
                  <Link
                    to="/inicio"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#F28C28] text-[#0B1E33] font-bold text-sm hover:bg-[#FFA242] transition-colors min-h-[44px]"
                  >
                    <span>Ir a mi panel</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/registro"
                      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#F28C28] text-[#0B1E33] font-bold text-sm hover:bg-[#FFA242] transition-colors min-h-[44px]"
                    >
                      <span>Crear cuenta</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      to="/iniciar-sesion"
                      className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white text-[#102C49] font-semibold text-sm hover:bg-slate-100 transition-colors min-h-[44px]"
                    >
                      <span>Iniciar sesión</span>
                    </Link>
                  </>
                )}

                <Link
                  to="/explorar"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border border-[#3B648F] bg-[#102C49] text-white font-semibold text-sm hover:bg-[#163B61] transition-colors min-h-[44px]"
                >
                  <Compass className="h-4 w-4 text-[#FFA94D]" />
                  <span>Explorar productos aprobados</span>
                </Link>
              </div>
            </div>

            <div className="pt-4 border-t border-[#244B73] flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-300">
              <span>Piloto Castro · Región de Los Lagos</span>
              <span aria-hidden="true">·</span>
              <span>Cero dinero ni compraventa</span>
              <span aria-hidden="true">·</span>
              <span>Moderación previa obligatoria</span>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[300px] lg:min-h-[440px] rounded-3xl overflow-hidden border border-[#244B73] bg-[#102C49]">
              <ImageWithFallback
                src={heroCastroImg}
                alt="Comunidad de Castro compartiendo libros, ropa y herramientas en espacio de economía circular"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Principios clave en franja horizontal */}
      <section className="bg-[#081626] border-y border-[#244B73] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#102C49] rounded-2xl p-6 border border-[#244B73] space-y-2.5">
            <Gift className="h-6 w-6 text-[#FFA94D]" />
            <h2 className="font-display font-bold text-base text-white">Regalar sin dinero</h2>
            <p className="text-sm text-slate-200 leading-relaxed">
              Entrega gratuitamente objetos útiles a personas, familias o escuelas de tu comuna.
            </p>
          </div>
          <div className="bg-[#102C49] rounded-2xl p-6 border border-[#244B73] space-y-2.5">
            <RefreshCw className="h-6 w-6 text-white" />
            <h2 className="font-display font-bold text-base text-white">Intercambio directo</h2>
            <p className="text-sm text-slate-200 leading-relaxed">
              Propón intercambios de objetos aprobados mediante acuerdo libre y chat privado.
            </p>
          </div>
          <div className="bg-[#102C49] rounded-2xl p-6 border border-[#244B73] space-y-2.5">
            <ShieldCheck className="h-6 w-6 text-[#6EE7B7]" />
            <h2 className="font-display font-bold text-base text-white">Comunidad protegida</h2>
            <p className="text-sm text-slate-200 leading-relaxed">
              Moderación obligatoria, confirmación bilateral de entregas y protección de domicilios.
            </p>
          </div>
          <div className="bg-[#102C49] rounded-2xl p-6 border border-[#244B73] space-y-2.5">
            <Trees className="h-6 w-6 text-[#6EE7B7]" />
            <h2 className="font-display font-bold text-base text-white">Árbol e Impacto real</h2>
            <p className="text-sm text-slate-200 leading-relaxed">
              Cada operación confirmada por ambas partes hace crecer tu Árbol Circular y mide impacto.
            </p>
          </div>
        </div>
      </section>

      {/* Sección educativa y territorial */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 rounded-3xl overflow-hidden border border-[#244B73] aspect-[4/3]">
            <ImageWithFallback
              src={showcaseObjectsImg}
              alt="Objetos cotidianos restaurados listos para una segunda oportunidad"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="lg:col-span-7 space-y-5">
            <p className="text-xs font-semibold text-[#6EE7B7] bg-[#143D29] border border-[#34D399]/35 inline-block px-3 py-1 rounded-lg">
              Educación ambiental y acción local en Chiloé
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Diseñada para comunidades escolares, organizaciones y hogares
            </h2>
            <p className="text-slate-200 leading-relaxed">
              Desde libros escolares hasta herramientas o mobiliario, PoliCircular acompaña el proceso completo: publicación revisada, coordinación segura en puntos de encuentro públicos, confirmación bilateral y aprendizaje en nuestro centro educativo.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/educacion"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#102C49] text-sm font-semibold hover:bg-slate-100 transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                <span>Explorar Aprendamos a Circular</span>
              </Link>
              <Link
                to="/impacto"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#3B648F] bg-[#102C49] text-white text-sm font-semibold hover:bg-[#163B61] transition-colors"
              >
                <span>Ver Impacto Circular</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
