import React from 'react';
import { ShieldCheck, AlertTriangle, Lock } from 'lucide-react';
import { PROHIBITED_ITEMS_LIST } from '../../utils/prohibitedContent';

export const CommunityRulesPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold text-white">
          Reglas comunitarias, términos de uso y privacidad
        </h1>
        <p className="text-sm text-slate-200">
          PoliCircular protege a las familias, establecimientos educacionales y organizaciones de Chiloé y Chile.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-[#244B73] bg-[#102C49] p-6 space-y-3">
          <div className="flex items-center gap-2 text-white font-display font-bold">
            <ShieldCheck className="h-5 w-5 text-[#6EE7B7]" />
            <h2>Principio no monetario</h2>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">
            PoliCircular NO es un marketplace comercial. Queda estrictamente prohibido publicar precios, solicitar dinero, transferencias, comisiones o cualquier forma de compraventa. Solo se permiten regalos gratuitos e intercambios directos sin dinero.
          </p>
        </section>

        <section className="rounded-2xl border border-[#244B73] bg-[#102C49] p-6 space-y-3">
          <div className="flex items-center gap-2 text-white font-display font-bold">
            <Lock className="h-5 w-5 text-[#FFA94D]" />
            <h2>Privacidad y protección de menores</h2>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">
            Nunca publicamos teléfonos, correos ni domicilios particulares. Los mapas muestran exclusivamente sectores aproximados. Para menores de edad se exige supervisión de un adulto responsable o establecimiento educacional, restringiendo comunicaciones privadas irrestrictas.
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-[#244B73] bg-[#102C49] p-6 space-y-4">
        <div className="flex items-center gap-2 text-white font-display font-bold">
          <AlertTriangle className="h-5 w-5 text-[#FFA94D]" />
          <h2>Publicaciones estrictamente prohibidas</h2>
        </div>
        <p className="text-sm text-slate-200">
          Todas las publicaciones pasan por moderación previa obligatoria antes de aparecer en Explorar. Se rechazarán o suspenderán publicaciones que incluyan:
        </p>
        <ul className="grid sm:grid-cols-2 gap-2.5 text-sm text-slate-200 list-disc list-inside">
          {PROHIBITED_ITEMS_LIST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
};
