import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

// TEMPORARY — one-time bootstrap for the first SUPER_ADMIN row after migrating
// off the single ADMIN_PASSWORD login. Gated by its own throwaway secret
// (SUPERADMIN_SEED_SECRET), unrelated to any other credential in this app.
// Delete this route and the env var once the admin account is confirmed working.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  if (!process.env.SUPERADMIN_SEED_SECRET || bearerSecret !== process.env.SUPERADMIN_SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!username || !password) {
    return NextResponse.json({ error: "username and password required" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await db.adminUser.upsert({
    where: { username },
    create: { username, passwordHash, role: "SUPER_ADMIN", canViewSpend: true },
    update: { passwordHash, role: "SUPER_ADMIN" },
  });

  return NextResponse.json({ ok: true, username });
}
