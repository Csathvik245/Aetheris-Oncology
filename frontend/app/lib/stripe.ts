import Stripe from "stripe";

// Server-only. Never import this from a Client Component.
export function createStripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export const STRIPE_PRICE_ENV_BY_TIER = {
  starter: "STRIPE_PRICE_STARTER",
  professional: "STRIPE_PRICE_PROFESSIONAL",
  academic: "STRIPE_PRICE_ACADEMIC",
} as const;

export type PaidTier = keyof typeof STRIPE_PRICE_ENV_BY_TIER;

export function priceIdForTier(tier: PaidTier): string | null {
  return process.env[STRIPE_PRICE_ENV_BY_TIER[tier]] || null;
}

export function tierForPriceId(priceId: string): PaidTier | null {
  for (const tier of Object.keys(STRIPE_PRICE_ENV_BY_TIER) as PaidTier[]) {
    if (priceIdForTier(tier) === priceId) return tier;
  }
  return null;
}
