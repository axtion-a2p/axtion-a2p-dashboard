import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncSubAccount } from "@/app/admin/(dashboard)/actions";

export const dynamic = "force-dynamic";

// TextGrid doesn't publicly document a request-signing scheme the way Twilio
// does, so this endpoint is protected by a shared secret query param instead
// (register the callback URL as .../api/webhooks/textgrid?secret=...). Like
// the Twilio webhook, it only triggers a re-sync rather than trusting the
// body as authoritative.
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!process.env.TEXTGRID_WEBHOOK_SECRET || secret !== process.env.TEXTGRID_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));
  const candidateSid = params.Sid || params.BrandSid || params.CampaignSid || params.CustomerProfileSid;

  const subAccount = candidateSid
    ? await db.subAccount.findFirst({
        where: {
          provider: "TEXTGRID",
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
        message: `TextGrid webhook received: ${JSON.stringify(params).slice(0, 500)}`,
        actor: "textgrid",
      },
    });
    await syncSubAccount(subAccount.id);
  }

  return NextResponse.json({ ok: true });
}
