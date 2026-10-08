import { db } from "@/lib/db";
import type { ResolvedRange } from "./range";
import { errorCodeLabel } from "./statusMapping";

export type DeliverySummaryRow = {
  subAccountId: string;
  businessName: string;
  spend: number | null; // null when the viewer isn't allowed to see spend
  callsSent: number;
  smsSent: number;
  mmsSent: number;
  delivered: number;
  failed: number; // FAILED + UNDELIVERED combined — see FailureBreakdownRow for the split
};

export async function getDeliverySummary(
  range: ResolvedRange,
  accessibleSubAccountIds: string[],
  canSeeSpend: boolean
): Promise<DeliverySummaryRow[]> {
  if (accessibleSubAccountIds.length === 0) return [];

  const [subAccounts, groups] = await Promise.all([
    db.subAccount.findMany({
      where: { id: { in: accessibleSubAccountIds } },
      select: { id: true, businessName: true },
      orderBy: { businessName: "asc" },
    }),
    db.deliveryEvent.groupBy({
      by: ["subAccountId", "channel", "status"],
      where: { subAccountId: { in: accessibleSubAccountIds }, occurredAt: { gte: range.from, lte: range.to } },
      _count: { _all: true },
      _sum: { priceAmount: true },
    }),
  ]);

  const rows = new Map<string, DeliverySummaryRow>(
    subAccounts.map((s) => [
      s.id,
      { subAccountId: s.id, businessName: s.businessName, spend: canSeeSpend ? 0 : null, callsSent: 0, smsSent: 0, mmsSent: 0, delivered: 0, failed: 0 },
    ])
  );

  for (const g of groups) {
    const row = rows.get(g.subAccountId);
    if (!row) continue;
    const count = g._count._all;
    if (g.channel === "VOICE") row.callsSent += count;
    if (g.channel === "SMS") row.smsSent += count;
    if (g.channel === "MMS") row.mmsSent += count;
    if (g.status === "DELIVERED") row.delivered += count;
    if (g.status === "FAILED" || g.status === "UNDELIVERED") row.failed += count;
    if (canSeeSpend && row.spend !== null && g._sum.priceAmount) {
      row.spend += Math.abs(Number(g._sum.priceAmount));
    }
  }

  return Array.from(rows.values());
}

export type FailureBreakdownRow = {
  subAccountId: string;
  businessName: string;
  channel: "SMS" | "MMS" | "VOICE";
  status: "FAILED" | "UNDELIVERED";
  errorCode: number | null;
  reasonLabel: string;
  count: number;
};

export async function getFailureBreakdown(
  range: ResolvedRange,
  accessibleSubAccountIds: string[]
): Promise<FailureBreakdownRow[]> {
  if (accessibleSubAccountIds.length === 0) return [];

  const [subAccounts, groups] = await Promise.all([
    db.subAccount.findMany({ where: { id: { in: accessibleSubAccountIds } }, select: { id: true, businessName: true } }),
    db.deliveryEvent.groupBy({
      by: ["subAccountId", "channel", "status", "errorCode"],
      where: {
        subAccountId: { in: accessibleSubAccountIds },
        occurredAt: { gte: range.from, lte: range.to },
        status: { in: ["FAILED", "UNDELIVERED"] },
      },
      _count: { _all: true },
    }),
  ]);

  const nameById = new Map(subAccounts.map((s) => [s.id, s.businessName]));

  return groups
    .map((g) => ({
      subAccountId: g.subAccountId,
      businessName: nameById.get(g.subAccountId) ?? "Unknown",
      channel: g.channel,
      status: g.status as "FAILED" | "UNDELIVERED",
      errorCode: g.errorCode,
      reasonLabel: errorCodeLabel(g.errorCode) ?? (g.status === "UNDELIVERED" ? "Undelivered (no error code reported)" : "Failed (no error code reported)"),
      count: g._count._all,
    }))
    .sort((a, b) => b.count - a.count);
}

export type AccountMetrics = {
  delivered: number;
  failed: number;
  breakdown: { delivered: number; undelivered: number; failed: number; unknown: number };
};

export async function getAccountMetrics(subAccountId: string, range: ResolvedRange): Promise<AccountMetrics> {
  const groups = await db.deliveryEvent.groupBy({
    by: ["status"],
    where: { subAccountId, occurredAt: { gte: range.from, lte: range.to } },
    _count: { _all: true },
  });

  const breakdown = { delivered: 0, undelivered: 0, failed: 0, unknown: 0 };
  for (const g of groups) {
    if (g.status === "DELIVERED") breakdown.delivered += g._count._all;
    if (g.status === "UNDELIVERED") breakdown.undelivered += g._count._all;
    if (g.status === "FAILED") breakdown.failed += g._count._all;
    if (g.status === "UNKNOWN") breakdown.unknown += g._count._all;
  }

  return { delivered: breakdown.delivered, failed: breakdown.failed + breakdown.undelivered, breakdown };
}
