import { db } from "@/lib/db";
import { slugify } from "@/lib/subdomain";

/** Generate a unique subdomain slug from a business name, e.g. "Dean Capital LLC" -> "deancapitalllc". Server-only (queries the DB). */
export async function generateUniqueSubdomain(businessName: string): Promise<string> {
  const base = slugify(businessName);
  let candidate = base;
  let suffix = 2;
  while (await db.subAccount.findUnique({ where: { subdomain: candidate } })) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
  return candidate;
}
