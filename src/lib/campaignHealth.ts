import type { CampaignStatus } from "./providers/types";

/** Derives the operational health badge from a provider's CampaignStatus, factoring in `enabled` (registered/approved is not the same as actually live for traffic — see textgridProvider.ts). */
export function healthForStatus(status: CampaignStatus): "HEALTHY" | "AT_RISK" | "BLOCKED" {
  if (status.stage === "REJECTED" || status.stage === "SUSPENDED") return "BLOCKED";
  if (status.stage !== "APPROVED") return "AT_RISK";
  return status.enabled === false ? "AT_RISK" : "HEALTHY";
}
