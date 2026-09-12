import crypto from "node:crypto";

// Twilio's request-signing scheme (stable/unchanged for years): base64(HMAC-SHA1(
// authToken, url + sorted "key"+"value" pairs concatenated)), sent as
// X-Twilio-Signature. TextGrid's webhook payloads aren't documented publicly,
// so its route below can't be verified the same way — treat that endpoint as
// lower-trust until TextGrid's actual signing scheme is confirmed.
export function verifyTwilioSignature(url: string, params: Record<string, string>, signature: string, authToken: string): boolean {
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((key) => key + params[key])
      .join("");

  const expected = crypto.createHmac("sha1", authToken).update(Buffer.from(data, "utf-8")).digest("base64");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
