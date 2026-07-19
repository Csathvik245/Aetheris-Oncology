export type PlanTier =
  | "free_pilot"
  | "starter"
  | "professional"
  | "academic"
  | "enterprise";

export type AuthRole = "resident" | "faculty" | "admin";

export interface Institution {
  id: string;
  name: string;
  slug: string;
  plan_tier: PlanTier;
  status: "active" | "pending_payment";
  join_code: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
  learner_seat_limit: number | null;
  storage_limit_mb: number | null;
  case_gen_monthly_limit: number | null;
  case_gen_used_this_period: number;
  usage_period_start: string;
  storage_used_mb: number;
  free_pilot_started_at: string | null;
  free_pilot_expires_at: string | null;
  feature_flags: Record<string, boolean>;
  pilot_code_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  institution_id: string | null;
  role: AuthRole;
  display_role: string | null;
  full_name: string;
  avatar_initials: string | null;
  onboarded_at: string | null;
  preferences: Record<string, unknown>;
  is_platform_admin: boolean;
  created_at: string;
  updated_at: string;
}

export type PaidPlanTier = "starter" | "professional" | "academic";

export interface PlanSeatCap {
  plan_tier: PaidPlanTier;
  max_institutions: number;
  updated_at: string;
}

export interface PilotCode {
  id: string;
  code: string;
  plan_tier: PlanTier;
  target_institution_id: string | null;
  redeemed_institution_id: string | null;
  redeemed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface PilotRequest {
  id: string;
  institution_name: string;
  contact_name: string;
  contact_email: string;
  phone: string | null;
  message: string | null;
  status: "new" | "contacted" | "closed";
  created_at: string;
}

export interface ProfileWithInstitution extends Profile {
  institution: Institution | null;
}
