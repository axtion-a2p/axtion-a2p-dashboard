// Scrypt password hashing (Node's built-in crypto — no new dependency),
// mirroring the sibling switchboard project's own approach to this.

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { customAlphabet } from "nanoid";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

// No 0/O/1/l/I — same readable alphabet convention as generateSubAccountToken in auth.ts.
const TEMP_PASSWORD_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
const generateTempPasswordChars = customAlphabet(TEMP_PASSWORD_ALPHABET, 14);

/** Shown to the creating admin exactly once — never stored in plaintext anywhere. */
export function generateTempPassword(): string {
  return generateTempPasswordChars();
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  const storedBuf = Buffer.from(hashHex, "hex");
  if (storedBuf.length !== derived.length) return false;
  return timingSafeEqual(derived, storedBuf);
}
