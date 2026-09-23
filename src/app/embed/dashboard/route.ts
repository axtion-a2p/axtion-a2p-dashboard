import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Resolves a GHL location ID to that client's Command Center dashboard, for use as a
 * GHL custom menu link embed: https://<this-app>/embed/dashboard?locationId={{location.id}}
 * GHL substitutes {{location.id}} with the real location ID before loading the URL.
 */
export async function GET(request: NextRequest) {
  const locationId = request.nextUrl.searchParams.get("locationId");
  if (!locationId) {
    return new NextResponse("Missing locationId query parameter.", { status: 400 });
  }

  const subAccount = await db.subAccount.findFirst({ where: { ghlLocationId: locationId } });
  if (!subAccount) {
    return new NextResponse(
      `<!doctype html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;color:#475569;background:#f8fafc"><p>This location isn&apos;t linked to a Command Center account yet.</p></body></html>`,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  }

  return NextResponse.redirect(new URL(`/d/${subAccount.token}`, request.url));
}
