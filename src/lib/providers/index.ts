import { TenDlcProvider } from "./tenDlcProvider";
import type { ProviderAdapter } from "./types";

export type ProviderName = "TWILIO" | "TEXTGRID";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/**
 * Build a provider adapter for a given sub-account.
 *
 * `overrideSid`/`overrideToken` come from SubAccount.providerAccountSid /
 * providerAuthToken when a client has their own dedicated Twilio/TextGrid
 * account; otherwise this falls back to the platform-wide credentials, which
 * is the common case (one reseller account, one Messaging Service per client).
 */
export function getProvider(
  provider: ProviderName,
  overrideSid?: string | null,
  overrideToken?: string | null
): ProviderAdapter {
  if (provider === "TWILIO") {
    return new TenDlcProvider({
      accountSid: overrideSid || required("TWILIO_ACCOUNT_SID"),
      authToken: overrideToken || required("TWILIO_AUTH_TOKEN"),
      apiBase: process.env.TWILIO_API_BASE || "https://api.twilio.com",
      trustHubBase: process.env.TWILIO_TRUSTHUB_BASE || "https://trusthub.twilio.com",
      messagingBase: process.env.TWILIO_MESSAGING_BASE || "https://messaging.twilio.com",
      primaryBusinessProfileSid: required("TWILIO_PRIMARY_BUSINESS_PROFILE_SID"),
      statusEmail: required("TWILIO_STATUS_EMAIL"),
    });
  }

  return new TenDlcProvider({
    accountSid: overrideSid || required("TEXTGRID_ACCOUNT_SID"),
    authToken: overrideToken || required("TEXTGRID_AUTH_TOKEN"),
    apiBase: process.env.TEXTGRID_API_BASE || "https://api.textgrid.com",
    // UNVERIFIED hosts — TextGrid's public docs don't confirm a trusthub./messaging.
    // subdomain split like Twilio's. Override these once you have real TextGrid
    // API docs or support confirmation; a 404 here is the first thing to check.
    trustHubBase: process.env.TEXTGRID_TRUSTHUB_BASE || "https://trusthub.textgrid.com",
    messagingBase: process.env.TEXTGRID_MESSAGING_BASE || "https://messaging.textgrid.com",
    primaryBusinessProfileSid: required("TEXTGRID_PRIMARY_BUSINESS_PROFILE_SID"),
    statusEmail: required("TEXTGRID_STATUS_EMAIL"),
  });
}

export type { ProviderAdapter } from "./types";
export * from "./types";
