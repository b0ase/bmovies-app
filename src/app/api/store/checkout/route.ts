import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
  });
}

export async function POST(request: NextRequest) {
  try {
    const { quantity = 1 } = await request.json();
    const stripe = getStripe();

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.npgx.website";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "NPGX Agent",
              description:
                "NPGX Agent Phone — 26 AI characters, movie director, content exchange, OpenClaw runtime. Includes first month of cloud hosting.",
              images: [
                "https://www.npgx.website/images/npgx-agent/phone-1.jpg",
              ],
            },
            unit_amount: 40200, // $402.00 in cents
          },
          quantity: Math.min(Math.max(quantity, 1), 10),
        },
      ],
      shipping_address_collection: {
        allowed_countries: ["US", "GB", "CA", "AU", "DE", "FR", "NL", "JP"],
      },
      metadata: {
        type: 'npgx_licence',
        tier: '2',
        site: 'npgx',
      },
      success_url: `${siteUrl}/store/buy?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/store/buy`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Checkout failed";
    console.error("[checkout] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
