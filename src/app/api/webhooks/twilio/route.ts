import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyTwilioSignature } from "@/lib/verifyTwilioSignature";
import { syncSubAccount } from "@/app/admin/(dashboard)/actions";

export const dynamic = "force-dynamic";

// Registered as the StatusCallback on CustomerProfiles / BrandRegistrations /
// UsAppToPerson resources. We don't trust the webhook body as the source of
// truth (Twilio's exact callback field names for each resource type differ
// and aren't all pinned down here) — it's just a trigger to re-sync that
// sub-account from the API immediately instead of waiting for the next cron.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));
  const signature = request.headers.get("X-Twilio-Signature");
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken || !signature || !verifyTwilioSignature(request.url, params, signature, authToken)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 403 });
  }

  const candidateSid = params.Sid || params.BrandSid || params.CampaignSid || params.CustomerProfileSid;

  const subAccount = candidateSid
    ? await db.subAccount.findFirst({
        where: {
          OR: [
            { brand: { providerBrandId: candidateSid } },
            { campaigns: { some: { providerCampaignId: candidateSid } } },
          ],
        },
      })
    : null;

  if (subAccount) {
    await db.statusEvent.create({
      data: {
        subAccountId: subAccount.id,
        entityType: "WEBHOOK",
        message: `Twilio webhook received: ${JSON.stringify(params).slice(0, 500)}`,
        actor: "twilio",
      },
    });
    await syncSubAccount(subAccount.id);
  }

  return NextResponse.json({ ok: true });
}
