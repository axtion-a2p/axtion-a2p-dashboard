// REST client for Twilio's Trust Hub / Messaging / core APIs (form-urlencoded
// bodies, HTTP Basic Auth). TextGrid's actual 10DLC API is a separate, bespoke
// JSON+Bearer API — see textgridClient.ts / textgridProvider.ts — it does NOT
// share this client despite superficially resembling Twilio's core REST API
// (Accounts/.../IncomingPhoneNumbers.json) for non-10DLC endpoints.
//
// Twilio supports two Basic Auth credential pairs: the classic
// {AccountSid}:{AuthToken}, or an API Key {ApiKeySid}:{ApiKeySecret} (SK.../
// secret). Either pair works here — pass whichever two values should go in
// the Basic Auth header. The Account SID used in REST URL paths is tracked
// separately by the caller (TenDlcProviderConfig.accountSid) since it's
// always the AC... sid regardless of which auth pair is used.

export class ApiError extends Error {
  status: number;
  details: unknown;
  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export class RestClient {
  constructor(
    private authUsername: string,
    private authPassword: string
  ) {}

  private authHeader() {
    return "Basic " + Buffer.from(`${this.authUsername}:${this.authPassword}`).toString("base64");
  }

  async request<T = unknown>(
    method: "GET" | "POST" | "DELETE",
    url: string,
    form?: Record<string, string | boolean | number | string[] | undefined>
  ): Promise<T> {
    const hasBody = form && method !== "GET";
    let body: URLSearchParams | undefined;
    if (hasBody) {
      body = new URLSearchParams();
      for (const [key, value] of Object.entries(form!)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
          for (const item of value) body.append(key, item);
        } else {
          body.append(key, String(value));
        }
      }
    }

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: this.authHeader(),
        ...(hasBody ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      body,
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }

    if (!res.ok) {
      const message =
        (json as { message?: string })?.message ?? `Request to ${url} failed with ${res.status}`;
      throw new ApiError(message, res.status, json);
    }

    return json as T;
  }
}
