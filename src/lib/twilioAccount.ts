import { RestClient } from "@/lib/providers/restClient";

export type TwilioSubaccount = { sid: string; auth_token: string; friendly_name: string; status: string };

/**
 * Creates a Twilio subaccount under the platform's main Twilio account.
 *
 * This must authenticate as the MAIN account (Account SID + Auth Token):
 * Twilio standard API Keys can't manage the Accounts resource, so the
 * API-key credentials getProvider() prefers are deliberately not used here.
 * The returned auth_token is only ever shown once — persist it immediately.
 */
export async function createTwilioSubaccount(friendlyName: string): Promise<TwilioSubaccount> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error("Creating a Twilio subaccount needs TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN (the main account's, not an API key).");
  }
  const base = process.env.TWILIO_API_BASE || "https://api.twilio.com";
  const client = new RestClient(accountSid, authToken);
  return client.request<TwilioSubaccount>("POST", `${base}/2010-04-01/Accounts.json`, {
    FriendlyName: friendlyName.slice(0, 64),
  });
}
