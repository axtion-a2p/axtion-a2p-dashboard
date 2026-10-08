import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";

const ADMIN_COOKIE = "a2p_admin_session";

type AdminSessionPayload = { sub: string; username: string; role: "SUPER_ADMIN" | "RESTRICTED" };
const SUBACCOUNT_TOKEN_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/l/I

// 24 chars from a 55-symbol alphabet ~= 139 bits of entropy — unguessable
// enough to double as the only access control for a sub-account's dashboard.
const generateToken = customAlphabet(SUBACCOUNT_TOKEN_ALPHABET, 24);

export function generateSubAccountToken(): string {
  return generateToken();
}

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Missing required env var: SESSION_SECRET");
  return new TextEncoder().encode(secret);
}

export async function createAdminSession(user: { id: string; username: string; role: "SUPER_ADMIN" | "RESTRICTED" }) {
  const payload: AdminSessionPayload = { sub: user.id, username: user.username, role: user.role };
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecret());

  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function destroyAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

async function readSessionPayload(): Promise<AdminSessionPayload | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string" || typeof payload.username !== "string") return null;
    if (payload.role !== "SUPER_ADMIN" && payload.role !== "RESTRICTED") return null;
    return { sub: payload.sub, username: payload.username, role: payload.role };
  } catch {
    return null;
  }
}

export async function isAdminAuthed(): Promise<boolean> {
  return (await readSessionPayload()) !== null;
}

/**
 * Server Actions are reachable by their encoded action reference independent of
 * which page rendered them — the admin layout's redirect-on-unauthenticated only
 * runs for a real page *render*, not for a direct action invocation. Every
 * exported admin action must call this itself; layout-level redirect alone is
 * not enough.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthed())) {
    throw new Error("Not authenticated");
  }
}

export type CurrentAdminUser = {
  id: string;
  username: string;
  role: "SUPER_ADMIN" | "RESTRICTED";
  canViewSpend: boolean;
  accessibleSubAccountIds: string[] | "ALL";
};

/** Fresh-from-DB session info — permission changes (revoked access, canViewSpend toggle) take effect without re-login. */
export async function getCurrentAdminUser(): Promise<CurrentAdminUser | null> {
  const session = await readSessionPayload();
  if (!session) return null;

  const user = await db.adminUser.findUnique({
    where: { id: session.sub },
    include: { accessGrants: { select: { subAccountId: true } } },
  });
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    canViewSpend: user.role === "SUPER_ADMIN" || user.canViewSpend,
    accessibleSubAccountIds: user.role === "SUPER_ADMIN" ? "ALL" : user.accessGrants.map((g) => g.subAccountId),
  };
}

export async function requireSuperAdmin(): Promise<CurrentAdminUser> {
  const user = await getCurrentAdminUser();
  if (!user) throw new Error("Not authenticated");
  if (user.role !== "SUPER_ADMIN") throw new Error("Super admin access required");
  return user;
}

/** Resolves "ALL" against the real sub-account list — callers always get a concrete id array. */
export async function getAccessibleSubAccountIds(user: CurrentAdminUser): Promise<string[]> {
  if (user.accessibleSubAccountIds !== "ALL") return user.accessibleSubAccountIds;
  const all = await db.subAccount.findMany({ select: { id: true } });
  return all.map((s) => s.id);
}
