import type { DeliveryStatus } from "@/generated/prisma/enums";

// Twilio Message statuses: queued, sending, sent, failed, delivered, undelivered,
// receiving, received. Call statuses: queued, ringing, in-progress, completed,
// busy, failed, no-answer, canceled. Everything not explicitly resolved falls
// into UNKNOWN (still in flight) rather than guessing.
export function mapRawStatusToDeliveryStatus(rawStatus: string): DeliveryStatus {
  switch (rawStatus) {
    case "delivered":
    case "completed":
    case "received":
      return "DELIVERED";
    case "undelivered":
      return "UNDELIVERED";
    case "failed":
    case "busy":
    case "no-answer":
    case "canceled":
      return "FAILED";
    default:
      return "UNKNOWN";
  }
}

// Common Twilio error codes worth a human label. Not exhaustive — anything
// missing still displays its raw code with a link to Twilio's error lookup.
export const TWILIO_ERROR_LABELS: Record<number, string> = {
  30001: "Queue overflow",
  30002: "Account suspended",
  30003: "Unreachable destination handset",
  30004: "Message blocked by carrier or recipient",
  30005: "Unknown destination handset",
  30006: "Landline or unreachable carrier",
  30007: "Carrier violation / filtering",
  30008: "Unknown error from carrier",
  30009: "Missing inbound segment",
  30010: "Message price exceeds max price",
  21211: "Invalid 'To' phone number",
  21214: "'To' number not reachable",
  21408: "Permission to send to this region not enabled",
  21610: "Recipient has opted out (STOP)",
  21614: "'To' number is not a valid mobile number",
  13227: "Call rejected",
  32011: "Call failed to connect",
};

export function errorCodeLabel(code: number | null | undefined): string | undefined {
  if (code == null) return undefined;
  return TWILIO_ERROR_LABELS[code] ?? `Twilio error ${code} — see twilio.com/docs/api/errors/${code}`;
}
