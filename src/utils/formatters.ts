import type {
  AccountType,
  ExchangeStatus,
  InstitutionBadge,
  ProductCondition,
  ProductModality,
  ProductStatus,
  TreeStage,
  UserRole,
} from '../types/domain';

const CHILE_TZ = 'America/Santiago';

export function formatChileDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: CHILE_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
}

export function formatChileDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: CHILE_TZ,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

export const CONDITION_LABELS: Record<ProductCondition, string> = {
  new: 'Nuevo',
  good: 'Buen estado',
  needs_repair: 'Requiere reparación',
  for_recycling: 'Para reciclaje',
};

export const MODALITY_LABELS: Record<ProductModality, string> = {
  gift: 'Regalo gratuito',
  exchange: 'Intercambio',
};

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: 'Borrador',
  pending: 'Pendiente de moderación',
  approved: 'Aprobada',
  reserved: 'Reservada',
  in_delivery: 'En proceso de entrega',
  completed: 'Finalizada',
  rejected: 'Rechazada',
  suspended: 'Suspendida',
  archived: 'Archivada',
  expired: 'Vencida',
};

export const EXCHANGE_STATUS_LABELS: Record<ExchangeStatus, string> = {
  pending: 'Pendiente',
  coordinating: 'Coordinando',
  delivery_agreed: 'Entrega acordada',
  delivered_pending_confirm: 'Entregado por confirmar',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
  disputed: 'En disputa',
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  individual: 'Persona o familia',
  organization: 'Organización comunitaria',
  educational: 'Establecimiento educacional',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  user: 'Usuario',
  moderator: 'Moderador',
  admin: 'Administrador',
  super_admin: 'Superadministrador',
};

export const TREE_STAGE_INFO: Record<
  TreeStage,
  { label: string; minOps: number; nextOps: number | null; description: string }
> = {
  semilla: {
    label: 'Semilla',
    minOps: 0,
    nextOps: 1,
    description: 'Tu punto de partida en la economía circular comunitaria.',
  },
  brote: {
    label: 'Brote',
    minOps: 1,
    nextOps: 3,
    description: 'Completaste tu primera operación circular verificada por ambas partes.',
  },
  arbol_joven: {
    label: 'Árbol joven',
    minOps: 3,
    nextOps: 10,
    description: 'Tres objetos ya recibieron una segunda oportunidad gracias a ti.',
  },
  arbol_desarrollado: {
    label: 'Árbol desarrollado',
    minOps: 10,
    nextOps: 25,
    description: 'Diez operaciones exitosas fortaleciendo la reutilización en tu comuna.',
  },
  arbol_frutal: {
    label: 'Árbol frutal',
    minOps: 25,
    nextOps: null,
    description: 'Referente circular comunitario con 25 o más operaciones verificadas.',
  },
};

export const INSTITUTION_BADGE_LABELS: Record<InstitutionBadge, string> = {
  none: 'Sin distintivo asignado',
  escuela_circular: 'Escuela Circular',
  curso_reutilizador: 'Curso Reutilizador',
  comunidad_sustentable: 'Comunidad Sustentable',
  embajador_circular: 'Embajador Circular',
};
