export const RANGE_DAY_OPTIONS = [1, 3, 7, 14, 30] as const;
export type RangeDays = (typeof RANGE_DAY_OPTIONS)[number];

export type RangeKind = `${RangeDays}` | "custom";

export type ResolvedRange = { kind: RangeKind; from: Date; to: Date; label: string };

/**
 * Rolling windows (not calendar day/week/month) — simplest to reason about and
 * matches how Twilio's own console usage filters behave. All in UTC; a
 * timezone-aware filter would need the viewer's offset, not added here.
 */
export function resolveRange(kind: string | undefined, fromParam?: string, toParam?: string): ResolvedRange {
  const now = new Date();

  if (kind === "custom") {
    if (fromParam && toParam) {
      const from = new Date(fromParam);
      const to = new Date(toParam);
      // Make the "to" date inclusive of its whole day when it's a bare yyyy-mm-dd.
      if (toParam.length === 10) to.setUTCHours(23, 59, 59, 999);
      return { kind: "custom", from, to, label: `${fromParam} – ${toParam}` };
    }
    // Dates not picked yet — keep kind "custom" so the picker shows the date
    // inputs instead of silently reverting to a day-count button, with a
    // sensible placeholder window until the viewer applies real dates.
    return { kind: "custom", from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now, label: "Last 7 days" };
  }

  const parsed = Number(kind);
  const days: RangeDays = (RANGE_DAY_OPTIONS as readonly number[]).includes(parsed) ? (parsed as RangeDays) : 7;

  return {
    kind: `${days}`,
    from: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
    to: now,
    label: days === 1 ? "Last 24 hours" : `Last ${days} days`,
  };
}
