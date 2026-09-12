// REST client for TextGrid's APIs (both the "Breeze" core API and the 10DLC
// TCR-direct API). Confirmed via TextGrid's own docs:
// "These values should be passed in the Request Header 'Authorization', for
// every API call, as a Bearer token - {AccountSid}:{AuthToken} encoded in
// Base64" — note this is `Bearer`, not `Basic`, despite the base64(sid:token)
// encoding looking like classic Basic Auth. All 10DLC request/response bodies
// are JSON (not form-urlencoded like Twilio's).

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

export class TextGridClient {
  constructor(
    private accountSid: string,
    private authToken: string
  ) {}

  private authHeader() {
    return "Bearer " + Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
  }

  async request<T = unknown>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    url: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const hasBody = body !== undefined && method !== "GET";

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: this.authHeader(),
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
      },
      body: hasBody ? JSON.stringify(body) : undefined,
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
