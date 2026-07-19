import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createServiceRoleClient } from "@/app/lib/supabase/server";
import { createStripeClient, tierForPriceId } from "@/app/lib/stripe";
import { TIER_LIMITS } from "@/app/lib/tiers";

export const runtime = "nodejs";

async function applyTierToInstitution(institutionId: string, tier: keyof typeof TIER_LIMITS, extra: Record<string, unknown> = {}) {
  const limits = TIER_LIMITS[tier];
  const admin = createServiceRoleClient();
  await admin
    .from("institutions")
    .update({
      plan_tier: tier,
      learner_seat_limit: limits.learnerSeatLimit,
      storage_limit_mb: limits.storageLimitMb,
      case_gen_monthly_limit: limits.caseGenMonthlyLimit,
      feature_flags: limits.featureFlags,
      free_pilot_started_at: null,
      free_pilot_expires_at: null,
      ...extra,
    })
    .eq("id", institutionId);
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const body = await request.text();
  const stripe = createStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const institutionId = session.metadata?.institution_id ?? session.client_reference_id;
      const tier = session.metadata?.plan_tier as keyof typeof TIER_LIMITS | undefined;
      if (institutionId && tier) {
        await applyTierToInstitution(institutionId, tier, {
          status: "active",
          stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
          stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
          stripe_subscription_status: "active",
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const institutionId = subscription.metadata?.institution_id;
      const priceId = subscription.items.data[0]?.price?.id;
      const tier = priceId ? tierForPriceId(priceId) : null;
      if (institutionId && tier) {
        await applyTierToInstitution(institutionId, tier, {
          stripe_subscription_id: subscription.id,
          stripe_subscription_status: subscription.status,
        });
      } else if (institutionId) {
        const admin = createServiceRoleClient();
        await admin
          .from("institutions")
          .update({ stripe_subscription_status: subscription.status })
          .eq("id", institutionId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const institutionId = subscription.metadata?.institution_id;
      if (institutionId) {
        const admin = createServiceRoleClient();
        await admin.from("institutions").update({ stripe_subscription_status: "canceled" }).eq("id", institutionId);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
