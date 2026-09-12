// Generic REST client for the Twilio-shaped A2P 10DLC APIs.
//
// Both Twilio and TextGrid are driven through this client. TextGrid advertises
// itself as a drop-in-compatible REST API (same Account SID / Auth Token auth,
// same resource shapes) reachable by swapping the base host from
// api.twilio.com to api.textgrid.com. Twilio splits its API across a few
// hosts (api./trusthub./messaging.twilio.com); we assume TextGrid mirrors
// that host layout, but that specific assumption is UNVERIFIED and each host
// is independently overridable via env vars. If a TextGrid call 404s, check
// the corresponding *_BASE env var first before assuming the payload is wrong.

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
    private accountSid: string,
    private authToken: string
  ) {}

  private authHeader() {
    return "Basic " + Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
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
