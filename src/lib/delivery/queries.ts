import { db } from "@/lib/db";
import type { ResolvedRange } from "./range";
import { errorCodeLabel } from "./statusMapping";

// Twilio's own direction strings: "inbound" for received messages/calls;
// everything else ("outbound-api", "outbound-call", "outbound-reply",
// "outbound-dial") is something this account sent.
function isInbound(direction: string): boolean {
  return direction === "inbound";
}

export type DeliverySummaryRow = {
  subAccountId: string;
  businessName: string;
  spend: number | null; // null when the viewer isn't allowed to see spend
  callsSent: number;
  smsSent: number;
  mmsSent: number;
  received: number; // inbound messages/calls, any channel
  delivered: number;
  blocked: number; // Twilio status UNDELIVERED — accepted, then rejected by carrier/handset
  error: number; // Twilio status FAILED — never reached the carrier (bad number, account issue, etc.)
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
      by: ["subAccountId", "channel", "status", "direction"],
      where: { subAccountId: { in: accessibleSubAccountIds }, occurredAt: { gte: range.from, lte: range.to } },
      _count: { _all: true },
      _sum: { priceAmount: true },
    }),
  ]);

  const rows = new Map<string, DeliverySummaryRow>(
    subAccounts.map((s) => [
      s.id,
      {
        subAccountId: s.id,
        businessName: s.businessName,
        spend: canSeeSpend ? 0 : null,
        callsSent: 0,
        smsSent: 0,
        mmsSent: 0,
        received: 0,
        delivered: 0,
        blocked: 0,
        error: 0,
      },
    ])
  );

  for (const g of groups) {
    const row = rows.get(g.subAccountId);
    if (!row) continue;
    const count = g._count._all;
    const inbound = isInbound(g.direction);

    if (inbound) {
      row.received += count;
    } else {
      if (g.channel === "VOICE") row.callsSent += count;
      if (g.channel === "SMS") row.smsSent += count;
      if (g.channel === "MMS") row.mmsSent += count;
    }
    if (g.status === "DELIVERED") row.delivered += count;
    if (g.status === "UNDELIVERED") row.blocked += count;
    if (g.status === "FAILED") row.error += count;
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
  statusLabel: "Error" | "Blocked";
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
      statusLabel: (g.status === "UNDELIVERED" ? "Blocked" : "Error") as "Blocked" | "Error",
      errorCode: g.errorCode,
      reasonLabel:
        errorCodeLabel(g.errorCode) ??
        (g.status === "UNDELIVERED" ? "Blocked (no error code reported)" : "Error (no error code reported)"),
      count: g._count._all,
    }))
    .sort((a, b) => b.count - a.count);
}

export type AccountMetrics = {
  sent: number; // outbound messages/calls, any channel
  received: number; // inbound messages/calls, any channel
  delivered: number;
  blocked: number; // UNDELIVERED
  error: number; // FAILED
  pending: number; // UNKNOWN — still in flight (queued/sending/sent/ringing/...)
};

export async function getAccountMetrics(subAccountId: string, range: ResolvedRange): Promise<AccountMetrics> {
  const groups = await db.deliveryEvent.groupBy({
    by: ["status", "direction"],
    where: { subAccountId, occurredAt: { gte: range.from, lte: range.to } },
    _count: { _all: true },
  });

  const metrics: AccountMetrics = { sent: 0, received: 0, delivered: 0, blocked: 0, error: 0, pending: 0 };
  for (const g of groups) {
    const count = g._count._all;
    if (isInbound(g.direction)) {
      metrics.received += count;
    } else {
      metrics.sent += count;
      if (g.status === "DELIVERED") metrics.delivered += count;
      if (g.status === "UNDELIVERED") metrics.blocked += count;
      if (g.status === "FAILED") metrics.error += count;
      if (g.status === "UNKNOWN") metrics.pending += count;
    }
  }

  return metrics;
}
