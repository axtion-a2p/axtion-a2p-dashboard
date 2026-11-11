import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncSubAccount } from "@/app/admin/(dashboard)/actions";
import { verifyTextGridSignature } from "@/lib/textgridSignature";

export const dynamic = "force-dynamic";

// TextGrid's TCR event callbacks are configured manually in the TextGrid
// Dashboard (Settings → Advanced Settings → TCR Event Callback URL) — there's
// no API to register them.
//
// Authentication accepts EITHER of:
//  1. a valid X-TextGrid-Signature header (HMAC-SHA1 keyed by the account's Webhook
//     Secret over the public URL + raw body — see lib/textgridSignature.ts). Only the
//     platform account's secret (TEXTGRID_WEBHOOK_SECRET) is known here; per-client
//     sub-account secrets are not stored, so their events can't pass this check, or
//  2. the legacy shared secret appended as a second query param when registering the
//     callback URL: .../api/webhooks/textgrid?secret=...   (this is part of the signed
//     URL, so it also works alongside signing)
//
// TextGrid appends its own query param to differentiate these from regular
// Breeze API callbacks: `?TCREvent={eventType}` (e.g. BRAND_IDENTITY_STATUS_UPDATE,
// CAMPAIGN_EXPIRED). The POST body is flat JSON (not form-urlencoded):
// { cspId, brandName, campaignId, brandReferenceId, brandId, description,
//   mock, eventType, cspName, campaignReferenceId }
// Like the Twilio webhook, this only triggers a re-sync rather than trusting
// the body as authoritative.
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.TEXTGRID_WEBHOOK_SECRET;
  // Read the body raw: the signature covers the exact bytes TextGrid sent.
  const rawBody = await request.text();

  // The URL TextGrid actually called (behind Vercel's proxy, nextUrl may not carry the public host).
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const publicUrl = `${proto}://${host}${request.nextUrl.pathname}${request.nextUrl.search}`;

  const signed =
    !!webhookSecret &&
    verifyTextGridSignature(webhookSecret, request.headers.get("x-textgrid-signature"), publicUrl, rawBody);
  const sharedSecretOk = !!webhookSecret && request.nextUrl.searchParams.get("secret") === webhookSecret;
  if (!signed && !sharedSecretOk) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const eventType = request.nextUrl.searchParams.get("TCREvent");

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(rawBody);
  } catch {
    // ignore — treated as an empty payload below
  }

  const brandId = typeof body.brandId === "string" ? body.brandId : undefined;
  const campaignId = typeof body.campaignId === "string" ? body.campaignId : undefined;

  const subAccount =
    brandId || campaignId
      ? await db.subAccount.findFirst({
          where: {
            OR: [
              ...(brandId ? [{ brands: { some: { provider: "TEXTGRID" as const, providerBrandId: brandId } } }] : []),
              ...(campaignId ? [{ campaigns: { some: { provider: "TEXTGRID" as const, providerCampaignId: campaignId } } }] : []),
            ],
          },
        })
      : null;

  if (subAccount) {
    await db.statusEvent.create({
      data: {
        subAccountId: subAccount.id,
        entityType: "WEBHOOK",
        message: `TextGrid webhook received (${eventType ?? body.eventType ?? "unknown event"}): ${JSON.stringify(body).slice(0, 500)}`,
        actor: "textgrid",
      },
    });
    await syncSubAccount(subAccount.id);
  }

  return NextResponse.json({ ok: true });
}
