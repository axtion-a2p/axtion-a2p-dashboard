import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export async function requireSiteSubAccount(subdomain: string) {
  const subAccount = await db.subAccount.findUnique({ where: { subdomain } });
  if (!subAccount) notFound();
  return subAccount;
}
