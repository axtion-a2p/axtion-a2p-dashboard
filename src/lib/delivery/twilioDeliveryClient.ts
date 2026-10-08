// Twilio Messages/Calls REST API client for the delivery report. Reuses the
// same RestClient and credential-resolution rules as src/lib/providers/index.ts
// (per-sub-account override else platform-wide API Key/AuthToken), scoped down
// to just the two list endpoints this report needs.

import { RestClient } from "../providers/restClient";

export type TwilioMessageRecord = {
  sid: string;
  direction: string;
  status: string;
  error_code: number | null;
  error_message: string | null;
  price: string | null;
  price_unit: string | null;
  date_sent: string | null;
  date_created: string;
  num_media?: string; // "0".."10" — presence/count of media distinguishes MMS from SMS
};

export type TwilioCallRecord = {
  sid: string;
  direction: string;
  status: string;
  price: string | null;
  price_unit: string | null;
  start_time: string | null;
  date_created: string;
};

export type TwilioDeliveryClientConfig = {
  accountSid: string;
  authUsername: string;
  authPassword: string;
  apiBase: string;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/** Mirrors getProvider()'s credential resolution in src/lib/providers/index.ts. */
export function resolveTwilioDeliveryConfig(
  overrideSid?: string | null,
  overrideToken?: string | null
): TwilioDeliveryClientConfig {
  const accountSid = overrideSid || required("TWILIO_ACCOUNT_SID");
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
  return {
    accountSid,
    authUsername,
    authPassword,
    apiBase: process.env.TWILIO_API_BASE || "https://api.twilio.com",
  };
}

export class TwilioDeliveryClient {
  private client: RestClient;

  constructor(private config: TwilioDeliveryClientConfig) {
    this.client = new RestClient(config.authUsername, config.authPassword);
  }

  /** Lists Messages with DateSent >= since, following pagination (page_size capped at Twilio's max of 1000). */
  async listMessagesSince(since: Date): Promise<TwilioMessageRecord[]> {
    const isoDate = since.toISOString().slice(0, 10); // Twilio's DateSent filter is day-granularity
    let url =
      `${this.config.apiBase}/2010-04-01/Accounts/${this.config.accountSid}/Messages.json` +
      `?DateSent%3E=${isoDate}&PageSize=1000`;
    const results: TwilioMessageRecord[] = [];
    while (url) {
      const page = await this.client.request<{ messages: TwilioMessageRecord[]; next_page_uri: string | null }>(
        "GET",
        url
      );
      results.push(...page.messages);
      url = page.next_page_uri ? `${new URL(this.config.apiBase).origin}${page.next_page_uri}` : "";
    }
    return results;
  }

  /** Lists Calls with StartTime >= since, following pagination. */
  async listCallsSince(since: Date): Promise<TwilioCallRecord[]> {
    const isoDate = since.toISOString().slice(0, 10);
    let url =
      `${this.config.apiBase}/2010-04-01/Accounts/${this.config.accountSid}/Calls.json` +
      `?StartTime%3E=${isoDate}&PageSize=1000`;
    const results: TwilioCallRecord[] = [];
    while (url) {
      const page = await this.client.request<{ calls: TwilioCallRecord[]; next_page_uri: string | null }>(
        "GET",
        url
      );
      results.push(...page.calls);
      url = page.next_page_uri ? `${new URL(this.config.apiBase).origin}${page.next_page_uri}` : "";
    }
    return results;
  }
}
