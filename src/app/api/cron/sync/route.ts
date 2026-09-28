import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncSubAccount } from "@/app/admin/(dashboard)/actions";

export const dynamic = "force-dynamic";

// Vercel Cron (or any external scheduler) hits this on an interval to refresh
// brand/campaign status for every sub-account, since Twilio/TextGrid review
// happens asynchronously and webhooks alone aren't guaranteed to be configured.
// Schedule declared in vercel.json — that file existing is what actually makes
// Vercel invoke this; the route existing on its own does nothing on a timer.
// Vercel's own cron invocations send `Authorization: Bearer $CRON_SECRET`
// automatically; the `?secret=` query param is kept for manual/external use.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const secret = bearerSecret ?? request.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const subAccounts = await db.subAccount.findMany({ select: { id: true } });
  const results = await Promise.allSettled(subAccounts.map((s) => syncSubAccount(s.id)));
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ synced: subAccounts.length, failed });
}
