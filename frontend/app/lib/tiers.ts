import type { PlanTier } from "@/app/lib/supabase/types";

export interface TierLimits {
  label: string;
  monthlyPrice: number | null; // null = custom/contact sales
  learnerSeatLimit: number | null; // null = unlimited
  storageLimitMb: number | null;
  caseGenMonthlyLimit: number | null;
  featureFlags: Record<string, boolean>;
}

const MB = 1024;

export const TIER_LIMITS: Record<PlanTier, TierLimits> = {
  free_pilot: {
    label: "Free Pilot",
    monthlyPrice: 0,
    learnerSeatLimit: null,
    storageLimitMb: null,
    caseGenMonthlyLimit: null,
    featureFlags: { sso: false, lms_integration: false, api_access: false },
  },
  starter: {
    label: "Starter",
    monthlyPrice: 3500,
    learnerSeatLimit: 25,
    storageLimitMb: 25 * MB,
    caseGenMonthlyLimit: 500,
    featureFlags: { sso: false, lms_integration: false, api_access: false },
  },
  professional: {
    label: "Professional",
    monthlyPrice: 8000,
    learnerSeatLimit: 60,
    storageLimitMb: 100 * MB,
    caseGenMonthlyLimit: 2000,
    featureFlags: { sso: false, lms_integration: false, api_access: false },
  },
  academic: {
    label: "Academic",
    monthlyPrice: 13500,
    learnerSeatLimit: 120,
    storageLimitMb: 500 * MB,
    caseGenMonthlyLimit: null,
    featureFlags: { sso: false, lms_integration: false, api_access: false },
  },
  enterprise: {
    label: "Enterprise",
    monthlyPrice: null,
    learnerSeatLimit: null,
    storageLimitMb: null,
    caseGenMonthlyLimit: null,
    featureFlags: { sso: true, lms_integration: true, api_access: true },
  },
};

export const FREE_PILOT_DAYS = 45;
