import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { customAlphabet } from "nanoid";

const ADMIN_COOKIE = "a2p_admin_session";
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

export async function createAdminSession() {
  const token = await new SignJWT({ role: "admin" })
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

export async function isAdminAuthed(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.role === "admin";
  } catch {
    return false;
  }
}
