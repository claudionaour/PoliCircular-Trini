import React, { useEffect, useState } from 'react';
import { Award, BookOpen, CheckCircle2, HelpCircle, Leaf, Lightbulb } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import {
  listEducationProgress,
  saveEducationModuleProgress,
} from '../../services/treeImpactService';
import { isFirebaseConfigured } from '../../services/firebase';
import eduChiloeImg from '../../assets/images/edu_chiloe_sustainability_1794851579367.jpg';

interface Lesson {
  slug: string;
  title: string;
  summary: string;
  body: string;
  tip: string;
  challenge: string;
  quizQuestion: string;
  quizOptions: string[];
  correctIndex: number;
}

const LESSONS: Lesson[] = [
  {
    slug: 'economia-circular-base',
    title: '¿Qué es la economía circular y en qué se diferencia de la lineal?',
    summary: 'Del modelo extraer-usar-botar hacia mantener materiales y objetos en uso el mayor tiempo posible.',
    body: 'La economía lineal extrae recursos, fabrica bienes, los usa brevemente y los convierte en basura. En cambio, la economía circular diseña comunidades donde los objetos se reparan, comparten, regalan e intercambian para evitar residuos.',
    tip: 'Antes de desechar un mueble o libro, pregúntate quién en tu barrio o escuela podría darle una segunda vida.',
    challenge: 'Desafío semanal: identifica 3 objetos útiles en tu hogar que no hayas usado en el último año.',
    quizQuestion: '¿Cuál es el objetivo principal de la economía circular?',
    quizOptions: [
      'Mantener los productos y materiales en uso el mayor tiempo posible',
      'Producir más residuos para reciclar más rápido',
      'Reemplazar todos los productos cada temporada',
    ],
    correctIndex: 0,
  },
  {
    slug: 'reutilizacion-reparacion-reciclaje',
    title: 'Reutilización, reparación y reciclaje: prioridades',
    summary: 'Por qué reutilizar y reparar ahorran más energía y recursos que reciclar.',
    body: 'Reutilizar un objeto tal como está consume casi cero energía adicional. Reparar prolonga su ciclo original. Reciclar es indispensable cuando el objeto ya no puede cumplir su función, recuperando sus materias primas.',
    tip: 'En PoliCircular puedes publicar objetos en estado "Requiere reparación" o "Para reciclaje" para que talleres o escuelas los recuperen.',
    challenge: 'Repara una prenda, herramienta o libro dañado antes de ofrecerlo o reutilizarlo.',
    quizQuestion: 'Entre reutilizar, reparar y reciclar, ¿qué acción conserva mejor el valor original del objeto?',
    quizOptions: [
      'Botar al relleno sanitario',
      'Reutilizar directamente o reparar antes de reciclar',
      'Quemar los residuos en el patio',
    ],
    correctIndex: 1,
  },
  {
    slug: 'consumo-responsable-y-residuos',
    title: 'Consumo responsable, reducción de residuos y cuidado ambiental',
    summary: 'Cómo nuestras decisiones cotidianas reducen la presión sobre los rellenos sanitarios.',
    body: 'Cada objeto que circula sin pasar por una compra innecesaria evita fabricación, empaque, transporte marítimo o terrestre y disposición final. La reducción de residuos empieza por no adquirir lo superfluo y compartir recursos escolares o domésticos.',
    tip: 'Coordina intercambios de uniformes y textos escolares al cierre e inicio de cada año escolar.',
    challenge: 'Propón en tu curso o junta de vecinos una jornada de intercambio sin dinero.',
    quizQuestion: '¿Qué impacto genera compartir uniformes o textos escolares en comunidad?',
    quizOptions: [
      'Aumenta los desechos textiles y de papel',
      'Reduce residuos y evita consumo innecesario en las familias',
      'No tiene relación con el cuidado ambiental',
    ],
    correctIndex: 1,
  },
  {
    slug: 'economia-circular-chiloe',
    title: 'Economía circular en Chiloé: tradición de minga y futuro sustentable',
    summary: 'La colaboración comunitaria del archipiélago aplicada al cuidado del territorio insular.',
    body: 'En Chiloé la gestión de residuos enfrenta desafíos logísticos propios de un territorio insular. Recuperar herramientas, textiles, libros y materiales reutilizables en Castro y las demás comunas del archipiélago protege nuestros bosques, humedales y mar interior.',
    tip: 'Utiliza los puntos de encuentro comunitarios y establece acuerdos claros para evitar traslados innecesarios.',
    challenge: 'Comparte PoliCircular con un establecimiento educacional o comité ambiental de Chiloé.',
    quizQuestion: '¿Por qué es clave la economía circular en territorios insulares como Chiloé?',
    quizOptions: [
      'Porque reduce la generación de residuos en islas con ecosistemas sensibles',
      'Porque obliga a transportar todo fuera del archipiélago',
      'Porque promueve el uso de envases de un solo uso',
    ],
    correctIndex: 0,
  },
];

const SCHOOL_BADGES = [
  { name: 'Escuela Circular', desc: 'Establecimiento comprometido con la reutilización escolar.' },
  { name: 'Curso Reutilizador', desc: 'Curso que organiza campañas de intercambio de útiles y libros.' },
  { name: 'Comunidad Sustentable', desc: 'Organización vecinal o ambiental activa en el territorio.' },
  { name: 'Embajador Circular', desc: 'Liderazgo educativo y ciudadano en economía circular.' },
];

export const EducationCenterPage: React.FC = () => {
  const { user } = useAuth();
  const [activeLesson, setActiveLesson] = useState<Lesson>(LESSONS[0]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [completedSlugs, setCompletedSlugs] = useState<string[]>([]);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isFirebaseConfigured) return;
    listEducationProgress(user.uid)
      .then((rows) => setCompletedSlugs(rows.map((r) => r.module_slug)))
      .catch(() => {});
  }, [user]);

  const handleQuizSubmit = async () => {
    if (selectedAnswer === null) return;
    if (selectedAnswer !== activeLesson.correctIndex) {
      setQuizFeedback('Revisa la lectura e inténtalo nuevamente.');
      return;
    }

    setQuizFeedback('Respuesta correcta. Módulo educativo completado.');
    if (user && isFirebaseConfigured) {
      try {
        await saveEducationModuleProgress(user.uid, activeLesson.slug, 100);
        setCompletedSlugs((prev) =>
          prev.includes(activeLesson.slug) ? prev : [...prev, activeLesson.slug]
        );
      } catch {
        // Ignorar si falla silenciosamente sin conexión
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Banner territorial */}
      <section className="rounded-3xl overflow-hidden border border-[#244B73] bg-[#102C49] grid lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-center space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#6EE7B7]">
            <BookOpen className="h-4 w-4" />
            <span>Centro Educativo</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            APRENDAMOS A CIRCULAR
          </h1>
          <p className="text-sm text-slate-200 leading-relaxed">
            Contenidos, desafíos y cuestionarios sobre economía circular, reparación, consumo responsable y cuidado ambiental desde Castro y el Archipiélago de Chiloé.
          </p>
          <p className="text-xs font-medium text-slate-200 tabular-nums">
            Progreso registrado: {completedSlugs.length} de {LESSONS.length} módulos completados
          </p>
        </div>
        <div className="lg:col-span-6 min-h-[220px]">
          <ImageWithFallback
            src={eduChiloeImg}
            alt="Bahía de Castro y palafitos en Chiloé"
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* Selector de lecciones + lectura + cuestionario */}
      <div className="grid lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-4 space-y-2.5">
          {LESSONS.map((lesson, idx) => {
            const done = completedSlugs.includes(lesson.slug);
            const active = activeLesson.slug === lesson.slug;
            return (
              <button
                key={lesson.slug}
                type="button"
                onClick={() => {
                  setActiveLesson(lesson);
                  setSelectedAnswer(null);
                  setQuizFeedback(null);
                }}
                className={`w-full text-left rounded-2xl border p-4 transition-colors ${
                  active
                    ? 'border-[#F28C28] bg-[#F28C28] text-[#0B1E33]'
                    : 'border-[#244B73] bg-[#102C49] text-white hover:bg-[#163B61]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs opacity-90 font-semibold">
                  <span>Módulo 0{idx + 1}</span>
                  {done && <CheckCircle2 className={`h-4 w-4 ${active ? 'text-[#0B1E33]' : 'text-[#6EE7B7]'}`} />}
                </div>
                <h2 className="font-display font-bold text-sm mt-1">{lesson.title}</h2>
              </button>
            );
          })}
        </aside>

        <article className="lg:col-span-8 rounded-2xl bg-[#102C49] border border-[#244B73] p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-white">{activeLesson.title}</h2>
            <p className="text-sm font-medium text-[#FFA94D]">{activeLesson.summary}</p>
          </div>

          <p className="text-sm sm:text-base text-slate-200 leading-relaxed">{activeLesson.body}</p>

          {/* Infografía comparativa / Consejos */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-[#143D29] border border-[#34D399]/35 p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#6EE7B7]">
                <Lightbulb className="h-4 w-4" />
                <span>Consejo práctico</span>
              </div>
              <p className="text-xs text-slate-100 leading-relaxed">{activeLesson.tip}</p>
            </div>
            <div className="rounded-xl bg-[#2A2015] border border-[#F28C28]/40 p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#FFA94D]">
                <Leaf className="h-4 w-4" />
                <span>Actividad / Desafío</span>
              </div>
              <p className="text-xs text-slate-100 leading-relaxed">{activeLesson.challenge}</p>
            </div>
          </div>

          {/* Cuestionario interactivo */}
          <div className="pt-4 border-t border-[#244B73] space-y-3">
            <div className="flex items-center gap-2 font-display font-bold text-sm text-white">
              <HelpCircle className="h-4 w-4 text-[#FFA94D]" />
              <span>Cuestionario de comprobación</span>
            </div>
            <p className="text-sm font-medium text-white">{activeLesson.quizQuestion}</p>

            <div className="space-y-2">
              {activeLesson.quizOptions.map((opt, idx) => (
                <label
                  key={opt}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                    selectedAnswer === idx
                      ? 'border-[#FFA94D] bg-[#163B61] text-white font-semibold'
                      : 'border-[#244B73] bg-[#0B1E33] text-slate-200 hover:bg-[#163B61]/70'
                  }`}
                >
                  <input
                    type="radio"
                    name="edu_quiz"
                    checked={selectedAnswer === idx}
                    onChange={() => setSelectedAnswer(idx)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>

            {quizFeedback && (
              <p
                className={`text-xs p-3 rounded-xl border ${
                  selectedAnswer === activeLesson.correctIndex
                    ? 'bg-[#143D29] border-[#34D399]/40 text-[#6EE7B7]'
                    : 'bg-[#2A2015] border-[#F28C28]/40 text-[#FDE68A]'
                }`}
              >
                {quizFeedback}
              </p>
            )}

            <button
              type="button"
              onClick={handleQuizSubmit}
              disabled={selectedAnswer === null}
              className="px-5 py-2.5 rounded-xl bg-[#F28C28] text-[#0B1E33] text-xs font-bold hover:bg-[#FFA242] disabled:opacity-50"
            >
              Comprobar respuesta
            </button>
          </div>
        </article>
      </div>

      {/* Distintivos para establecimientos */}
      <section className="rounded-2xl bg-[#102C49] border border-[#244B73] p-6 space-y-4">
        <h2 className="font-display text-lg font-bold text-white">
          Distintivos para establecimientos educacionales y comunidades
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SCHOOL_BADGES.map((b) => (
            <div key={b.name} className="rounded-xl bg-[#0B1E33] border border-[#244B73] p-4 space-y-1.5">
              <Award className="h-5 w-5 text-[#FFA94D]" />
              <h3 className="font-display font-bold text-sm text-white">{b.name}</h3>
              <p className="text-xs text-slate-300">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
