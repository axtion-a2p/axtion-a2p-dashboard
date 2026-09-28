import type { CampaignStatus } from "./providers/types";

/** Derives the operational health badge from a provider's CampaignStatus, factoring in `enabled` (registered/approved is not the same as actually live for traffic — see textgridProvider.ts). */
export function healthForStatus(status: CampaignStatus): "HEALTHY" | "AT_RISK" | "BLOCKED" {
  if (status.stage === "REJECTED" || status.stage === "SUSPENDED") return "BLOCKED";
  if (status.stage !== "APPROVED") return "AT_RISK";
  return status.enabled === false ? "AT_RISK" : "HEALTHY";
}

/**
 * TextGrid's own dashboard shows a "Carrier Status" column that our `stage`/`health`
 * badges don't capture — confirmed it's `SecondaryDcaSharingStatus` from the raw
 * campaign payload (no dedicated endpoint for it; nothing else in the response
 * matches). Twilio has no equivalent field. Read directly from rawPayload rather
 * than adding a schema column, since it's just surfacing data we already store.
 */
export function carrierStatusLabel(campaign: { provider: string; rawPayload: unknown }): string | null {
  if (campaign.provider !== "TEXTGRID") return null;
  const raw = campaign.rawPayload as Record<string, unknown> | null;
  const status = raw?.SecondaryDcaSharingStatus;
  return typeof status === "string" ? status : null;
}

export const carrierStatusColor: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  COMPLETE: "bg-emerald-100 text-emerald-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
};
