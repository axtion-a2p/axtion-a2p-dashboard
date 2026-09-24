import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncSubAccount } from "@/app/admin/(dashboard)/actions";

export const dynamic = "force-dynamic";

// TextGrid's TCR event callbacks are configured manually in the TextGrid
// Dashboard (Settings → Advanced Settings → TCR Event Callback URL) — there's
// no API to register them. TextGrid doesn't document a request-signing scheme,
// so register the callback URL with a shared secret appended as a second query
// param: .../api/webhooks/textgrid?secret=...
//
// TextGrid appends its own query param to differentiate these from regular
// Breeze API callbacks: `?TCREvent={eventType}` (e.g. BRAND_IDENTITY_STATUS_UPDATE,
// CAMPAIGN_EXPIRED). The POST body is flat JSON (not form-urlencoded):
// { cspId, brandName, campaignId, brandReferenceId, brandId, description,
//   mock, eventType, cspName, campaignReferenceId }
// Like the Twilio webhook, this only triggers a re-sync rather than trusting
// the body as authoritative.
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!process.env.TEXTGRID_WEBHOOK_SECRET || secret !== process.env.TEXTGRID_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const eventType = request.nextUrl.searchParams.get("TCREvent");

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
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
