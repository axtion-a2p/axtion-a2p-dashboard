// REST client for Blocx (https://api.otterblocx.com). JSON bodies, two custom
// auth headers (no Basic/Bearer): `x-access-key-id` and `x-secret-access-key`.
// Spec: https://api.otterblocx.com/openapi.json — guides: /articles on the same host.

export class BlocxApiError extends Error {
  status: number;
  code?: string;
  details: unknown;
  constructor(message: string, status: number, details: unknown, code?: string) {
    super(message);
    this.name = "BlocxApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Blocx error bodies carry a machine `code` (e.g. "idempotency_conflict") and a
// human `message`; validation errors may nest details. Keep whichever is there.
function extractError(json: unknown): { message?: string; code?: string } {
  if (typeof json !== "object" || json === null) return {};
  const o = json as Record<string, unknown>;
  const message = [o.message, o.error, o.detail].find((v) => typeof v === "string") as string | undefined;
  const code = typeof o.code === "string" ? o.code : undefined;
  return { message, code };
}

export class BlocxClient {
  constructor(
    private accessKeyId: string,
    private secretAccessKey: string,
    private baseUrl: string
  ) {}

  async request<T = unknown>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    opts: { query?: Record<string, string | number | boolean | undefined>; body?: unknown } = {}
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
    const hasBody = opts.body !== undefined && method !== "GET";

    const res = await fetch(url, {
      method,
      headers: {
        "x-access-key-id": this.accessKeyId,
        "x-secret-access-key": this.secretAccessKey,
        Accept: "application/json",
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
      },
      body: hasBody ? JSON.stringify(opts.body) : undefined,
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }

    if (!res.ok) {
      const { message, code } = extractError(json);
      throw new BlocxApiError(message ?? `Blocx ${method} ${url.pathname} failed with ${res.status}`, res.status, json, code);
    }
    return json as T;
  }
}
