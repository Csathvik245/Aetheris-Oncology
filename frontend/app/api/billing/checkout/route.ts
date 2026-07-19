import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/app/lib/supabase/server";
import { createStripeClient, priceIdForTier, type PaidTier } from "@/app/lib/stripe";

const VALID_TIERS: PaidTier[] = ["starter", "professional", "academic"];

// Faculty/admin only — creates a Stripe Checkout session for the caller's
// institution to subscribe to (or change to) a paid tier. Enterprise has no
// fixed price (contact-sales), so it isn't handled here.
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, institution_id, institution:institutions(id, name, stripe_customer_id)")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || !profile.institution_id) {
    return NextResponse.json({ error: "Only an institution admin can manage billing." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const tier = body.tier as PaidTier;
  if (!VALID_TIERS.includes(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const priceId = priceIdForTier(tier);
  if (!priceId) {
    return NextResponse.json({ error: `No Stripe price configured for ${tier} yet.` }, { status: 500 });
  }

  const institution = Array.isArray(profile.institution) ? profile.institution[0] : profile.institution;
  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const stripe = createStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: profile.institution_id,
    customer: institution?.stripe_customer_id ?? undefined,
    customer_email: institution?.stripe_customer_id ? undefined : user.email,
    metadata: { institution_id: profile.institution_id, plan_tier: tier },
    subscription_data: { metadata: { institution_id: profile.institution_id, plan_tier: tier } },
    success_url: `${origin}/faculty/billing?checkout=success`,
    cancel_url: `${origin}/faculty/billing?checkout=canceled`,
  });

  return NextResponse.json({ url: session.url });
}
