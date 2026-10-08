export type RangeKind = "day" | "week" | "month" | "custom";

export type ResolvedRange = { kind: RangeKind; from: Date; to: Date; label: string };

/**
 * Rolling windows (not calendar day/week/month) — simplest to reason about and
 * matches how Twilio's own console usage filters behave. All in UTC; a
 * timezone-aware "day" filter would need the viewer's offset, not added here.
 */
export function resolveRange(kind: string | undefined, fromParam?: string, toParam?: string): ResolvedRange {
  const now = new Date();

  if (kind === "custom" && fromParam && toParam) {
    const from = new Date(fromParam);
    const to = new Date(toParam);
    // Make the "to" date inclusive of its whole day when it's a bare yyyy-mm-dd.
    if (toParam.length === 10) to.setUTCHours(23, 59, 59, 999);
    return { kind: "custom", from, to, label: `${fromParam} – ${toParam}` };
  }

  if (kind === "week") {
    return { kind: "week", from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now, label: "Last 7 days" };
  }

  if (kind === "month") {
    return { kind: "month", from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now, label: "Last 30 days" };
  }

  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);
  return { kind: "day", from: startOfDay, to: now, label: "Today" };
}
