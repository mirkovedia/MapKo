import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

// ─── Plan Price IDs (Stripe) ────────────────────────────────────
export const PLAN_PRICE_IDS = {
  pro: "price_pro_monthly",
  agency: "price_agency_monthly",
} as const;

export type StripePlanId = keyof typeof PLAN_PRICE_IDS;

// ─── Create Checkout Session ────────────────────────────────────
export async function createCheckoutSession(
  userId: string,
  planId: StripePlanId
): Promise<string> {
  const priceId = PLAN_PRICE_IDS[planId];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      user_id: userId,
      plan_tier: planId,
    },
    success_url: `${appUrl}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dashboard/billing`,
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session URL");
  }

  return session.url;
}
