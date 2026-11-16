import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getTreeProgress,
  listAllAchievements,
  listUserAchievements,
} from '../../services/treeImpactService';
import { formatChileDate, TREE_STAGE_INFO } from '../../utils/formatters';
import type { Achievement, TreeStage, UserAchievement, UserTreeProgress } from '../../types/domain';

const TreeStageIllustration: React.FC<{ stage: TreeStage }> = ({ stage }) => {
  return (
    <svg viewBox="0 0 280 240" className="w-full max-w-[260px] h-auto mx-auto" aria-hidden="true">
      {/* Tierra / base */}
      <ellipse cx="140" cy="212" rx="95" ry="16" fill="#143D29" />
      <path d="M55 210 Q140 194 225 210" stroke="#34D399" strokeWidth="3" fill="none" />

      {stage === 'semilla' && (
        <g>
          <ellipse cx="140" cy="196" rx="16" ry="11" fill="#8C5A3C" />
          <path d="M140 185 Q144 172 152 168" stroke="#52B788" strokeWidth="4" strokeLinecap="round" fill="none" />
        </g>
      )}

      {stage === 'brote' && (
        <g>
          <path d="M140 206 V142" stroke="#1E7E48" strokeWidth="6" strokeLinecap="round" />
          <path d="M140 165 C140 140 175 130 182 150 C172 166 150 170 140 165Z" fill="#52B788" />
          <path d="M140 175 C140 154 108 145 102 163 C112 178 130 180 140 175Z" fill="#F28C28" />
        </g>
      )}

      {stage === 'arbol_joven' && (
        <g>
          <path d="M140 208 V115" stroke="#7A4E32" strokeWidth="10" strokeLinecap="round" />
          <path d="M140 155 L112 130" stroke="#7A4E32" strokeWidth="5" strokeLinecap="round" />
          <path d="M140 142 L168 122" stroke="#7A4E32" strokeWidth="5" strokeLinecap="round" />
          <circle cx="140" cy="100" r="36" fill="#52B788" />
          <circle cx="110" cy="122" r="24" fill="#3D9970" />
          <circle cx="170" cy="118" r="24" fill="#74C69D" />
        </g>
      )}

      {stage === 'arbol_desarrollado' && (
        <g>
          <path d="M140 210 V95" stroke="#6B4226" strokeWidth="14" strokeLinecap="round" />
          <path d="M140 150 L98 115" stroke="#6B4226" strokeWidth="7" strokeLinecap="round" />
          <path d="M140 135 L182 105" stroke="#6B4226" strokeWidth="7" strokeLinecap="round" />
          <circle cx="140" cy="78" r="46" fill="#2D6A4F" />
          <circle cx="98" cy="105" r="34" fill="#40916C" />
          <circle cx="182" cy="102" r="34" fill="#52B788" />
          <circle cx="140" cy="108" r="32" fill="#74C69D" />
        </g>
      )}

      {stage === 'arbol_frutal' && (
        <g>
          <path d="M140 210 V88" stroke="#5C3820" strokeWidth="16" strokeLinecap="round" />
          <path d="M140 152 L92 112" stroke="#5C3820" strokeWidth="8" strokeLinecap="round" />
          <path d="M140 138 L188 100" stroke="#5C3820" strokeWidth="8" strokeLinecap="round" />
          <circle cx="140" cy="72" r="50" fill="#1E7E48" />
          <circle cx="92" cy="102" r="38" fill="#2D6A4F" />
          <circle cx="188" cy="98" r="38" fill="#40916C" />
          <circle cx="140" cy="104" r="36" fill="#52B788" />
          {/* Frutos circulares naranjos */}
          <circle cx="116" cy="74" r="7" fill="#F28C28" />
          <circle cx="162" cy="66" r="7" fill="#F28C28" />
          <circle cx="94" cy="108" r="7" fill="#F28C28" />
          <circle cx="188" cy="104" r="7" fill="#F28C28" />
          <circle cx="142" cy="106" r="7" fill="#F28C28" />
        </g>
      )}
    </svg>
  );
};

const STAGE_ORDER: TreeStage[] = [
  'semilla',
  'brote',
  'arbol_joven',
  'arbol_desarrollado',
  'arbol_frutal',
];

export const CircularTreePage: React.FC = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<UserTreeProgress | null>(null);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getTreeProgress(user.uid),
      listAllAchievements(),
      listUserAchievements(user.uid),
    ])
      .then(([prog, allAch, userAch]) => {
        setProgress(prog);
        setAllAchievements(allAch);
        setUserAchievements(userAch);
      })
      .catch(() => {});
  }, [user]);

  const stage: TreeStage = progress?.current_stage ?? 'semilla';
  const stageInfo = TREE_STAGE_INFO[stage];
  const ops = progress?.completed_operations ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Mi Árbol Circular</h1>
        <p className="text-sm text-slate-300">
          Tu árbol crece únicamente con operaciones reales confirmadas por ambas partes. Las publicaciones pendientes o activas no suman operaciones.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-stretch">
        <section className="lg:col-span-5 rounded-2xl bg-[#102C49] border border-[#244B73] p-6 flex flex-col justify-between text-center">
          <div>
            <p className="text-xs font-semibold text-[#6EE7B7]">Etapa actual</p>
            <h2 className="font-display text-2xl font-bold text-white mt-1">{stageInfo.label}</h2>
          </div>

          <div className="my-4">
            <TreeStageIllustration stage={stage} />
          </div>

          <div className="space-y-3">
            <p className="text-sm text-slate-200">{stageInfo.description}</p>
            {stageInfo.nextOps !== null && (
              <p className="text-xs text-slate-300 tabular-nums">
                Faltan <strong className="text-white">{Math.max(0, stageInfo.nextOps - ops)}</strong> operaciones confirmadas para la siguiente etapa.
              </p>
            )}
          </div>
        </section>

        <section className="lg:col-span-7 rounded-2xl bg-[#102C49] border border-[#244B73] p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-[#0B1E33] border border-[#244B73] p-4">
              <span className="text-xs text-slate-300 block">Operaciones</span>
              <span className="font-mono text-2xl font-bold text-white tabular-nums">{ops}</span>
            </div>
            <div className="rounded-xl bg-[#0B1E33] border border-[#244B73] p-4">
              <span className="text-xs text-slate-300 block">Regalos</span>
              <span className="font-mono text-2xl font-bold text-[#6EE7B7] tabular-nums">
                {progress?.completed_gifts ?? 0}
              </span>
            </div>
            <div className="rounded-xl bg-[#0B1E33] border border-[#244B73] p-4">
              <span className="text-xs text-slate-300 block">Intercambios</span>
              <span className="font-mono text-2xl font-bold text-[#FFA94D] tabular-nums">
                {progress?.completed_exchanges ?? 0}
              </span>
            </div>
          </div>

          <div>
            <h3 className="font-display font-bold text-sm text-white mb-3">
              Etapas de crecimiento
            </h3>
            <div className="space-y-2">
              {STAGE_ORDER.map((s) => {
                const info = TREE_STAGE_INFO[s];
                const reached = ops >= info.minOps;
                return (
                  <div
                    key={s}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs ${
                      s === stage
                        ? 'border-[#34D399]/50 bg-[#143D29] text-white font-semibold'
                        : reached
                          ? 'border-[#244B73] bg-[#0B1E33] text-slate-200'
                          : 'border-[#1D3E63] bg-[#081626] text-slate-400'
                    }`}
                  >
                    <span>{info.label}</span>
                    <span className="font-mono tabular-nums">
                      {info.minOps === 0 ? 'Registro' : `${info.minOps} operaciones`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Insignias */}
      <section className="rounded-2xl bg-[#102C49] border border-[#244B73] p-6 space-y-4">
        <h2 className="font-display text-lg font-bold text-white">Insignias circulares</h2>
        {allAchievements.length === 0 ? (
          <p className="text-xs text-slate-300">
            El catálogo oficial de insignias se sincronizará al inicializar la semilla territorial en Firestore.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allAchievements.map((ach) => {
              const unlocked = userAchievements.find((ua) => ua.achievement_id === ach.id);
              return (
                <div
                  key={ach.id}
                  className={`rounded-xl border p-4 flex items-start gap-3 ${
                    unlocked ? 'border-[#34D399]/40 bg-[#143D29]' : 'border-[#244B73] bg-[#0B1E33] opacity-80'
                  }`}
                >
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                      unlocked ? 'bg-[#34D399] text-[#0B1E33]' : 'bg-[#1A3B5C] text-slate-300'
                    }`}
                  >
                    {unlocked ? <Award className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-display font-bold text-sm text-white">{ach.name}</h3>
                      {unlocked && <CheckCircle2 className="h-3.5 w-3.5 text-[#6EE7B7]" />}
                    </div>
                    <p className="text-xs text-slate-200">{ach.description}</p>
                    {unlocked && (
                      <p className="text-[11px] text-[#6EE7B7] font-medium">
                        Desbloqueada el {formatChileDate(unlocked.unlocked_at)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
