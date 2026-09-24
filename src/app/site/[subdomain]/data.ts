import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export async function requireSiteSubAccount(subdomain: string) {
  const subAccount = await db.subAccount.findUnique({
    where: { subdomain },
    include: {
      campaigns: { select: { useCase: true } },
      brands: { select: { vertical: true, stage: true } },
    },
  });
  if (!subAccount) notFound();
  return subAccount;
}

/** Prefers an approved brand's vertical, falling back to any brand that has one set. */
export function siteVertical(subAccount: { brands: { vertical: string | null; stage: string }[] }): string | null {
  const approved = subAccount.brands.find((b) => b.stage === "APPROVED" && b.vertical);
  return approved?.vertical ?? subAccount.brands.find((b) => b.vertical)?.vertical ?? null;
}
