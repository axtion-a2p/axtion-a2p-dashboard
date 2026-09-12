export const stageColor: Record<string, string> = {
  NOT_SUBMITTED: "bg-neutral-100 text-neutral-600",
  PENDING_REVIEW: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-800",
  REJECTED: "bg-red-100 text-red-800",
  SUSPENDED: "bg-red-100 text-red-800",
};

export const healthColor: Record<string, string> = {
  UNKNOWN: "bg-neutral-100 text-neutral-600",
  HEALTHY: "bg-emerald-100 text-emerald-800",
  AT_RISK: "bg-amber-100 text-amber-800",
  BLOCKED: "bg-red-100 text-red-800",
};

export function stageLabel(stage: string): string {
  return stage
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
