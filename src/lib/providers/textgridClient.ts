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

// TextGrid's error responses are inconsistent across endpoints: seen so far are
// {"message": "..."}, {"error": "..."}, and {"Error": "..."} where the value
// is itself a JSON-encoded string like '[{"code":501,"description":"...","fields":[...]}]'.
function extractErrorMessage(json: unknown): string | undefined {
  if (typeof json !== "object" || json === null) return undefined;
  const obj = json as Record<string, unknown>;
  const raw = obj.message ?? obj.Message ?? obj.error ?? obj.Error;
  if (typeof raw !== "string") return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((e) => (e?.description ? `${e.description}${e.fields ? ` (${e.fields.join(", ")})` : ""}` : JSON.stringify(e)))
        .join("; ");
    }
  } catch {
    // not JSON — just a plain string message
  }
  return raw;
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
      throw new ApiError(extractErrorMessage(json) ?? `Request to ${url} failed with ${res.status}`, res.status, json);
    }

    return json as T;
  }
}
