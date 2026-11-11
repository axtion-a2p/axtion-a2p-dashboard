import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { provisionClient } from "@/lib/provisioning";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // two provider API calls in sequence

// Called by the Replit checkout app after each successful payment. Creates the
// client's sub-account plus a dedicated Twilio subaccount and TextGrid
// sub-account. Idempotent on `externalRef` (the payment id), so Replit can
// retry freely. Provider auth tokens are never returned — they stay in the DB.
//
//   POST /api/provision
//   Authorization: Bearer $PROVISION_API_SECRET
//   { "externalRef": "pi_123", "businessName": "Acme LLC", "contactEmail": "...",
//     "contactName": "...", "provider": "TWILIO"|"TEXTGRID" (default TWILIO),
//     "ghlLocationId": "...", "ghlLocationName": "..." }

const schema = z.object({
  externalRef: z.string().trim().min(1).max(200),
  businessName: z.string().trim().min(1).max(200),
  contactName: z.string().trim().max(200).optional(),
  contactEmail: z.string().trim().email().optional(),
  provider: z.enum(["TWILIO", "TEXTGRID"]).default("TWILIO"),
  ghlLocationId: z.string().trim().max(200).optional(),
  ghlLocationName: z.string().trim().max(200).optional(),
});

function authorized(request: NextRequest, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  // Hash both sides so the comparison is constant-time regardless of length.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(secret).digest();
  return given.length > 0 && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const secret = process.env.PROVISION_API_SECRET;
  if (!secret) return NextResponse.json({ error: "provisioning is not configured" }, { status: 503 });
  if (!authorized(request, secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid input", field: parsed.error.issues[0]?.path.join(".") }, { status: 400 });
  }

  try {
    const result = await provisionClient(parsed.data);
    if (result.outcome === "name_conflict") {
      return NextResponse.json(
        { error: "a sub-account with this business name already exists under a different externalRef", existingDashboardUrl: result.existingDashboardUrl },
        { status: 409 }
      );
    }
    // complete -> 200 (or 201 if new). partial -> 502 so the caller retries and only the missing account is created.
    // in_progress -> 202: another request for the same payment is mid-flight.
    const status = result.outcome === "complete" ? (result.alreadyExisted ? 200 : 201) : result.outcome === "in_progress" ? 202 : 502;
    return NextResponse.json(result, { status });
  } catch (err) {
    console.error("provision failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "provisioning failed" }, { status: 500 });
  }
}
