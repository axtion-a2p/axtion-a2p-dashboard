import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export async function requireSiteSubAccount(subdomain: string) {
  const subAccount = await db.subAccount.findUnique({
    where: { subdomain },
    include: { campaigns: { select: { useCase: true } } },
  });
  if (!subAccount) notFound();
  return subAccount;
}
