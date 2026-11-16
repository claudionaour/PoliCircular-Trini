export type AccountType = 'individual' | 'organization' | 'educational';
export type UserRole = 'user' | 'moderator' | 'admin' | 'super_admin';
export type ProductCondition = 'new' | 'good' | 'needs_repair' | 'for_recycling';
export type ProductModality = 'gift' | 'exchange';
export type ProductStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'reserved'
  | 'in_delivery'
  | 'completed'
  | 'rejected'
  | 'suspended'
  | 'archived'
  | 'expired';

export type InterestDecision = 'interested' | 'discarded' | 'favorite';
export type MatchRequestStatus = 'pending' | 'accepted' | 'rejected' | 'chat_requested' | 'cancelled';
export type ExchangeStatus =
  | 'pending'
  | 'coordinating'
  | 'delivery_agreed'
  | 'delivered_pending_confirm'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type TreeStage =
  | 'semilla'
  | 'brote'
  | 'arbol_joven'
  | 'arbol_desarrollado'
  | 'arbol_frutal';

export type InstitutionBadge =
  | 'none'
  | 'escuela_circular'
  | 'curso_reutilizador'
  | 'comunidad_sustentable'
  | 'embajador_circular';

export interface Commune {
  id: string;
  name: string;
  region: string;
  country: string;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Sector {
  id: string;
  commune_id: string;
  name: string;
  description: string | null;
  approx_lat: number | null;
  approx_lng: number | null;
  is_active: boolean;
  created_at: string;
}

export interface EducationalInstitution {
  id: string;
  name: string;
  institution_code: string | null;
  commune_id: string | null;
  sector_id: string | null;
  responsible_name: string;
  badge_level: InstitutionBadge;
  is_verified: boolean;
  created_at: string;
  communes?: { name: string } | null;
}

export interface Profile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  commune_id: string | null;
  sector_id: string | null;
  account_type: AccountType;
  institution_id: string | null;
  institution_name: string | null;
  institution_description: string | null;
  responsible_person: string | null;
  institutional_code: string | null;
  is_minor_supervised: boolean;
  guardian_authorization_note: string | null;
  is_suspended: boolean;
  suspension_reason: string | null;
  reputation_avg: number;
  reputation_count: number;
  terms_accepted_at: string | null;
  created_at: string;
  updated_at: string;
  communes?: { id: string; name: string; region: string } | null;
  sectors?: { id: string; name: string; approx_lat: number | null; approx_lng: number | null } | null;
}

export interface PrivateContact {
  user_id: string;
  private_email: string | null;
  private_phone: string | null;
  updated_at: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_name: string;
  estimated_weight_kg: number;
  sort_order: number;
  is_active: boolean;
}

export interface ProductImage {
  id: string;
  product_id: string;
  storage_path: string;
  public_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface Product {
  id: string;
  owner_id: string;
  category_id: string;
  title: string;
  description: string;
  condition: ProductCondition;
  modality: ProductModality;
  desired_exchange_items: string | null;
  total_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  commune_id: string;
  sector_id: string | null;
  delivery_method: string;
  status: ProductStatus;
  moderation_notes: string | null;
  moderated_by: string | null;
  moderated_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  categories?: Category | null;
  communes?: Commune | null;
  sectors?: Sector | null;
  profiles?: Pick<
    Profile,
    'id' | 'full_name' | 'username' | 'avatar_url' | 'account_type' | 'institution_name' | 'reputation_avg' | 'reputation_count' | 'is_minor_supervised'
  > | null;
  product_images?: ProductImage[];
}

export interface MatchRequest {
  id: string;
  target_product_id: string;
  requester_id: string;
  owner_id: string;
  modality: ProductModality;
  offered_product_id: string | null;
  requested_quantity: number;
  message: string | null;
  status: MatchRequestStatus;
  created_at: string;
  target_product?: Product | null;
  offered_product?: Product | null;
  requester?: Profile | null;
  owner?: Profile | null;
}

export interface MatchRecord {
  id: string;
  request_id: string;
  target_product_id: string;
  offered_product_id: string | null;
  owner_id: string;
  requester_id: string;
  modality: ProductModality;
  quantity_reserved: number;
  status: 'active' | 'completed' | 'cancelled' | 'disputed';
  created_at: string;
  target_product?: Product | null;
  offered_product?: Product | null;
  owner?: Profile | null;
  requester?: Profile | null;
  conversations?: Conversation[] | null;
  exchanges?: ExchangeRecord[] | null;
}

export interface Conversation {
  id: string;
  match_id: string;
  participant_a: string;
  participant_b: string;
  is_blocked: boolean;
  blocked_by: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface ExchangeConfirmation {
  id: string;
  exchange_id: string;
  user_id: string;
  confirmed_at: string;
  notes: string | null;
}

export interface ExchangeRecord {
  id: string;
  match_id: string;
  status: ExchangeStatus;
  proposed_date: string | null;
  proposed_time_slot: string | null;
  meeting_point_label: string | null;
  meeting_point_lat: number | null;
  meeting_point_lng: number | null;
  proposed_by: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  completed_at: string | null;
  created_at: string;
  matches?: MatchRecord | null;
  exchange_confirmations?: ExchangeConfirmation[];
}

export interface Review {
  id: string;
  exchange_id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  rating_compliance: number;
  rating_punctuality: number;
  rating_condition: number;
  rating_communication: number;
  rating_respect: number;
  overall_rating: number;
  comment: string | null;
  is_flagged: boolean;
  created_at: string;
  reviewer?: Pick<Profile, 'id' | 'full_name' | 'username' | 'avatar_url'> | null;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'tree' | 'milestone' | 'education';
  required_operations: number;
  icon_name: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievements?: Achievement | null;
}

export interface UserTreeProgress {
  user_id: string;
  completed_operations: number;
  completed_gifts: number;
  completed_exchanges: number;
  current_stage: TreeStage;
  updated_at: string;
}

export interface ImpactRecord {
  id: string;
  exchange_id: string;
  product_id: string;
  category_id: string;
  commune_id: string;
  sector_id: string | null;
  modality: ProductModality;
  quantity: number;
  weight_kg: number;
  weight_type: 'estimated' | 'measured';
  created_at: string;
  categories?: { name: string } | null;
  communes?: { name: string } | null;
  sectors?: { name: string } | null;
}

export interface AppNotification {
  id: string;
  user_id: string;
  event_type: string;
  title: string;
  body: string;
  link_path: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface ReportRecord {
  id: string;
  reporter_id: string;
  target_type: 'product' | 'user' | 'conversation' | 'review' | 'exchange';
  target_id: string;
  reason_category: string;
  description: string;
  status: 'open' | 'under_review' | 'resolved' | 'dismissed';
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  reporter?: Pick<Profile, 'id' | 'full_name' | 'username'> | null;
}

export interface ModerationLog {
  id: string;
  actor_id: string;
  target_type: string;
  target_id: string;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  notes: string | null;
  created_at: string;
  actor?: Pick<Profile, 'full_name' | 'username'> | null;
}
