import { createHmac, timingSafeEqual } from "node:crypto";

// TextGrid webhook signing, per https://docs.textgrid.com/docs/verifying-webhook-signatures
//
//   header:   X-TextGrid-Signature
//   key:      the account's Webhook Secret (NOT the Auth Token), used verbatim as UTF-8 —
//             not Base64-decoded
//   message:  GET  -> the full public URL incl. its original query string
//             POST -> the full public callback URL (incl. query) immediately followed by
//                     the raw request body, no separator
//   escaping: every UTF-16 code unit > 127 in the message becomes a literal \uXXXX
//             (4 lowercase hex digits); an emoji is therefore two surrogate escapes
//   digest:   Base64( HMAC-SHA1(key, UTF-8(escaped message)) )

export function escapeNonAscii(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    out += code > 127 ? "\\u" + code.toString(16).padStart(4, "0") : text[i];
  }
  return out;
}

export function textGridSignature(webhookSecret: string, publicUrl: string, rawBody = ""): string {
  return createHmac("sha1", Buffer.from(webhookSecret, "utf8"))
    .update(Buffer.from(escapeNonAscii(publicUrl + rawBody), "utf8"))
    .digest("base64");
}

/** Constant-time check of an X-TextGrid-Signature header value. Missing/malformed headers fail. */
export function verifyTextGridSignature(
  webhookSecret: string,
  header: string | null | undefined,
  publicUrl: string,
  rawBody = "",
): boolean {
  if (!header || !webhookSecret) return false;
  const received = Buffer.from(header.trim(), "base64");
  const expected = Buffer.from(textGridSignature(webhookSecret, publicUrl, rawBody), "base64");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
