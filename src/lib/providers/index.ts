import { TenDlcProvider } from "./tenDlcProvider";
import { TextGridProvider } from "./textgridProvider";
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
 * An override always uses the classic {AccountSid}:{AuthToken} auth pair for
 * Twilio (the DB only stores two credential columns) — API Key auth (below)
 * is only available for the platform-wide default.
 */
export function getProvider(
  provider: ProviderName,
  overrideSid?: string | null,
  overrideToken?: string | null
): ProviderAdapter {
  if (provider === "TWILIO") {
    const accountSid = overrideSid || required("TWILIO_ACCOUNT_SID");
    // Prefer API Key auth (SK.../secret) when configured for the platform-wide
    // default; otherwise fall back to the classic AccountSid:AuthToken pair.
    // A per-subaccount override always uses the classic pair, since it's a
    // per-subaccount Auth Token, not an API Key.
    let authUsername: string;
    let authPassword: string;
    if (overrideToken) {
      authUsername = accountSid;
      authPassword = overrideToken;
    } else if (process.env.TWILIO_API_KEY_SID && process.env.TWILIO_API_KEY_SECRET) {
      authUsername = process.env.TWILIO_API_KEY_SID;
      authPassword = process.env.TWILIO_API_KEY_SECRET;
    } else {
      authUsername = accountSid;
      authPassword = required("TWILIO_AUTH_TOKEN");
    }
    return new TenDlcProvider({
      accountSid,
      authUsername,
      authPassword,
      apiBase: process.env.TWILIO_API_BASE || "https://api.twilio.com",
      trustHubBase: process.env.TWILIO_TRUSTHUB_BASE || "https://trusthub.twilio.com",
      messagingBase: process.env.TWILIO_MESSAGING_BASE || "https://messaging.twilio.com",
      primaryBusinessProfileSid: required("TWILIO_PRIMARY_BUSINESS_PROFILE_SID"),
      statusEmail: required("TWILIO_STATUS_EMAIL"),
    });
  }

  return new TextGridProvider({
    accountSid: overrideSid || required("TEXTGRID_ACCOUNT_SID"),
    authToken: overrideToken || required("TEXTGRID_AUTH_TOKEN"),
    apiBase: process.env.TEXTGRID_API_BASE || "https://api.textgrid.com/2010-04-01",
  });
}

export type { ProviderAdapter } from "./types";
export * from "./types";
