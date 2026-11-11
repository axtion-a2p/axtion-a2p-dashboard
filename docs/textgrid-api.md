# TextGrid API reference (as used by this dashboard)

Reviewed against https://docs.textgrid.com on 2026-11-11 (Getting Started, the `llms.txt`
index, 20+ guides and reference pages). Where the docs are silent this says so — don't fill
the gaps from Twilio assumptions. TextGrid is Twilio-*shaped*, not Twilio.

Index of every page: https://docs.textgrid.com/llms.txt (append `.md` to a docs URL for plain text).

## 1. Basics

| | |
|---|---|
| Base URL | `https://api.textgrid.com/2010-04-01` (other dates change nothing) |
| Lookups | `https://lookups.textgrid.com/v1` |
| Credentials | Account SID + Auth Token + **Webhook Secret**, shown on Dashboard → Overview. Viewing/rotating the Auth Token needs 2FA. |
| Auth (either works) | **Basic**: `--user SID:TOKEN`. **Bearer**: `Authorization: Bearer base64("SID:TOKEN")` — *not* OAuth. This dashboard uses Bearer (`textgridClient.ts`). |
| Format | URL suffix decides **response** format: `…/Accounts/{sid}.json` → JSON, same route without `.json` → XML. `Accept` is ignored. **Request** format is separate and varies per endpoint (below). |
| JSON vs XML naming | JSON snake_case (`account_balance`), XML PascalCase (`AccountBalance`). JSON omits nulls. Dates are `ddd, dd MMM yyyy HH:mm:ss +0000` in JSON (not ISO 8601). |
| Pagination | `Page` (zero-based, default 0) + `PageSize` (default 50, max not stated). List responses carry `page, page_size, start, end, total, num_pages, next_page_uri, …`. |

**Request body encodings** (a frequent source of 400 "Invalid Parameter values"):

- JSON: send message (`/Messages.json`), 10DLC (`/campaigns/*`), outbound call, update call forwarding.
- Form-urlencoded (or query values): create sub-account, change sub-account status, buy/update incoming number.
- 10DLC, opt-in/out, lookups, email, bulk messaging and webhooks are **not** governed by the `.json` suffix rule.

**SIDs.** Some TextGrid SIDs are Base64-looking and contain `=` or `~` (e.g. `P0N0hJ…==`). The docs say
nothing about URL-encoding them. In practice: **put them in paths unencoded** — percent-encoding `==`
returned 400 on Get Account Details. A SID containing `~` has also been flaky on later calls
(see client-onboarding-runbook.md).

**Main vs sub-accounts.** Every sub-account has its own SID, Auth Token and Webhook Secret. Use a
sub-account's SID and token *together*; never mix one account's SID with another's token. Main-account
credentials may perform supported admin operations on sub-accounts; changing the SID in a URL does not
move numbers/messages/brands. Sub-accounts may share the main account's messaging allowance.

## 2. Accounts

| Operation | Request |
|---|---|
| Get account details | `GET /Accounts/{accountSid}.json` — returns `status, date_created, date_updated, auth_token, friendly_name, owner_account_sid, uri, sid, type, webhook_secret, account_balance` (balance only populated here). Query params: none. |
| List sub-accounts | `GET /Accounts.json?Page=0&PageSize=50&friendlyName=…` — omits auth tokens, may include webhook secrets. |
| Create sub-account | `POST /Accounts.json`, **form** `friendlyName` (required, non-empty; query value also accepted). Response includes `sid`, `auth_token`, `webhook_secret` — don't log. Creation does **not** enable numbers, registration or features. |
| Change name/status | `POST /Accounts/{subAccountSid}.json`, form `friendlyName` and/or `status` = `active` \| `suspended` \| `closed`. A non-empty `friendlyName` wins over `status` (send them separately). Responses report suspended and closed both as `closed`. A disabled sub-account can't authenticate with its own creds; reactivate with main creds. Doesn't delete numbers/brands/campaigns. |
| Send email | `POST /Accounts/{accountSid}/Email` (path inferred from the reference slug `post_accounts_accountsid_email`) — needs enablement, a body and ≥1 to/cc/bcc; `isBodyHtml` defaults true. |

Errors: 400 `{"Message": …}` (may be empty), 401, 404, 500 `{"Message": …}`.

## 3. 10DLC (brands & campaigns)

All `/campaigns/*` calls are JSON + the same Bearer auth, and **brands/campaigns belong to the account that
authenticated the call** — which is why this dashboard creates one TextGrid sub-account per client.
Field names are matched case-insensitively. Registration, vetting, appeals and campaign fees can all be
charged; avoid duplicate submissions while waiting.

Flow: enums → create brand → (vetting/appeal) → eligibility → create campaign → (CTA/MMS media) →
attach numbers.

1. **Enums** (never hard-code): `GET /campaigns/enum/{entityType|vertical|usecase|brandRelationship|altBusinessIdType|stockExchange}`.
2. **Brand**: `POST /campaigns/brand/nonblocking` (doesn't wait for verification). Fields: `entityType, displayName, companyName, ein, einIssuingCountry, phone, street, city, state, postalCode, country, email, website, brandRelationship, vertical, stockSymbol, stockExchange, altBusinessId(+Type), universalEin, firstName, lastName, referenceId, mobilePhone, mock`. No schema-level required fields (requirements vary by entity). **The docs state sole-proprietor registration is NOT supported on this endpoint** (the dashboard still has Sole-Prop OTP calls from an older doc — treat as unverified). `GET /campaigns/brand`, `GET/DELETE /campaigns/brand/{brandId}`, `PUT /campaigns/brand` (edit by `brandId` in body). `identityStatus` = `UNVERIFIED` needs a Brand Identity Appeal (IRS CP575) — **dashboard only, not API**. Vetting: `POST|PUT /campaigns/brand/{brandId}/externalVetting`.
3. **Eligibility**: `GET /campaigns/brand/{brandId}/usecase/{usecase}` → fees (`monthlyFee/quarterlyFee/annualFee`), `minSubUsecases/maxSubUsecases`, and per-carrier rules under `mnoMetadata` (`_10017`, `_10035`, `_10038`: `qualify, reqSubscriberOptin/Optout/Help, noEmbeddedLink, noEmbeddedPhone, minMsgSamples, mnoReview, brandTier, brandDailyCap, tpm, msgClass, surcharge`). Re-check when the use case changes.
4. **Create campaign**: `POST /campaigns/campaign`. **Required: `privacyPolicyLink`, `termsAndConditionsLink` (non-empty).** Optional: `brandId, usecase, subUsecases[], resellerId, description, embeddedLink, embeddedPhone, numberPool, ageGated, directLending, subscriberOptin/Optout/Help, autoRenewal, affiliateMarketing, expediteCampaign, sample1…sample5, messageFlow, mnoIds[], referenceId, helpKeywords/Message, optinKeywords/Message, optoutKeywords/Message`. `resellerId` is the TCR reseller id (`R000000` = none) — never an account SID. Creating a campaign does **not** let numbers send.
5. **Media**: `POST /campaigns/{campaignId}/cta` and `/mms` — JSON `{File: <base64>, FileName, MimeType}` (not multipart).
6. **Read**: `GET /campaigns/campaign`, `GET /campaigns/campaign/{id}`, `GET /campaigns/brand/{brandId}/campaign` (the plain `?brandId=` filter on `/campaigns/campaign` is ignored). Review state lives in `SecondaryDcaSharingStatus` (PENDING/ACCEPTED/DECLINED) + `SecondaryDcaDeclineReason`; `status` stays `ACTIVE` even when declined; `campaignEnabled=false` until approved.
7. **Edit**: `PUT /campaigns/campaign/{id}` — edits *without* resubmitting. Editable: `resellerId, description, sample1-5, messageFlow, help/optin/optout keywords+messages, privacyPolicyLink, termsAndConditionsLink, autoRenewal, embeddedLink/Phone, numberPool, directLending, affiliateMarketing, ageGated, resubmit, expediteCampaign`. **Not editable:** `brandId, usecase, subUsecases, subscriberOptin/Out/Help, mnoIds, referenceId`. `PUT /campaigns/campaign/{id}/resubmit` = same body + request re-review.
8. **Numbers**: `POST /campaigns/number/{campaignId}` body `{"phoneNumberSids": [...]}` (phone-number **SIDs**, not E.164). A 200 is only acceptance — attachment takes minutes to days; confirm with `GET /campaigns/number/{campaignId}` or `GET /campaigns/number/{phoneSid}/campaign`. Detach: `DELETE /campaigns/number/{phoneNumberSid}`. Deactivate campaign: `DELETE /campaigns/campaign/{id}`.
9. **Import**: `GET /campaigns/{campaignId}/import/{accountSid}` — a *GET* with a side effect: associates an existing campaign with that account.
10. No Messaging Service concept: a Twilio `MessagingServiceSid` can't be used as `from`; send from a TextGrid number.

Errors: 400 `{"error": …}` or `{"Error": …}` (handle both casings; value is sometimes a JSON-encoded string), 401, 404 `{"Error": …}`, 500 `{"Error": …}`.

**Registration webhook** (`registrationEvent`): configured in the TextGrid Dashboard (not the API). `POST` JSON
to your URL with `?TCREvent=<event>` appended. Body: `cspId, brandName, brandReferenceId, brandId, description,
evpName, eventType, evpId, vettingId, cspName, dcaId, campaignId, dcaName, mock, campaignReferenceId`
(+ possibly extra provider fields — ignore unknowns). Event names are **not documented**; treat as opaque.
Respond 200. No retries — reconcile by fetching the brand/campaign.

## 4. Phone numbers

- Search: `GET /Accounts/{sid}/AvailablePhoneNumbers/US/Local.json?areaCode=480` (areaCode is the only filter; doesn't reserve).
- Buy: `POST /Accounts/{sid}/IncomingPhoneNumbers.json` **form** `phoneNumber` (`+` → `%2B`), `friendlyName`, optional callback URLs. Billable; on timeout list numbers before retrying (a retry can buy a second number). Response `sid` is the phone-number SID used for campaign attachment.
- List/get: `GET …/IncomingPhoneNumbers.json` (zero-based paging) and `…/{PhoneNumberSid}.json` (includes `CampaignID, CampaignName, ConnectionStatus`).
- Update: `POST …/{PhoneNumberSid}.json` **form** `friendlyName, smsUrl, smsMethod, voiceUrl, voiceMethod, statusCallback, statusCallbackMethod`. Delete: `DELETE …/{PhoneNumberSid}.json` (may not be re-acquirable).
- Caller ID: `POST /Accounts/{sid}/CallerID.json`. Forwarding: `GET|POST …/{PhoneNumberSid}/forward.json` — when enabled, `voiceUrl` is never requested.
- Account may be limited (e.g. "Account Limited to 5 numbers").

## 5. Messaging

- Send: `POST /Accounts/{sid}/Messages.json`, **JSON** `{from, to (E.164), body | mediaUrl[], statusCallback?}`. Body or media required. MMS needs account + number enablement (error `4403`). Media URLs must be fetchable without auth and stay up ≥3 days. Response `sid`, `status`, `num_segments`, `num_media`, `error_code`, `error_message` — success ≠ delivery. No scheduled/future sends.
- Retrieve/list/media: `GET …/Messages/{MessageSid}.json`, `…/Messages.json`, `…/Messages/{sid}/Media.json`. `status` is `"state - description"` — split on the first `" - "`.
- States: `queued, sent, pending, delivered, failed, undelivered, received`. See delivery-status-reference for the ~100 description strings and which are retry-safe (don't resend queued/pending; don't retry opt-outs).
- Bulk: `POST /Accounts/{sid}/BulkMessages.json` (path inferred from the reference slug; needs permission). Opt-in/out API: `/optin/…` (single, group, status).
- STOP/UNSTOP/START/HELP keywords are handled by TextGrid and **still reach your webhook**; if TextGrid already auto-replied, your reply TwiML is skipped (an API send is not) — don't double-reply.
- Limits: daily allowance shared across sub-accounts (Dashboard → Overview → Messaging limits); `403 "SMS Sending Limit reached"` single / `400` bulk — stop, don't loop. HTTP 429 → back off, honor `Retry-After`. Queue-capacity text inside a delivery description is *not* HTTP 429.

## 6. Webhooks

- Incoming message: form POST (default) or GET to `smsUrl`: `MessageSid/SmsSid/SmsMessageSid, AccountSid, From, To, Body, NumMedia, NumSegments, MediaUrlN/MediaContentTypeN` (zero-based). Ack 200/201/202/204; reply with messaging TwiML (`application/xml`) or an empty `<Response/>`. Timeout default 15 s; 2 attempts only when transport status is 0 (an HTTP 500 does **not** retry); then SMS Fallback once.
- Status callback: per-message `statusCallback` wins over the number's. Fields `MessageSid, MessageStatus/SmsStatus, SmsStatusDetail?, Segments, …`. **One attempt, no retry, no fallback** — reconcile via fetch.
- Voice callbacks return TwiML; `<Gather>` DTMF only (no speech, no `<Stream>`, no SIP).
- Source IPs (allowlist, keep verifying signatures): `4.154.12.229, 13.66.251.110, 20.115.164.8, 20.191.85.152`.
- **Signature** — header `X-TextGrid-Signature`, keyed by the **Webhook Secret** (not the Auth Token; used verbatim, not Base64-decoded):
  1. message = GET: full public URL with its original query; POST: public URL (with query) immediately followed by the **raw** body (no separator);
  2. replace each UTF-16 code unit > 127 with `\uXXXX` (lowercase hex);
  3. `Base64(HMAC-SHA1(secret_utf8, message_utf8))`; compare in constant time.
  Implemented in `src/lib/textgridSignature.ts`, verified against TextGrid's vectors
  (secret `example-webhook-secret`; GET `https://example.com/webhook?tenant=demo&MessageSid=EXAMPLE_MESSAGE_SID&Digits=001%23` → `LFs56mFCQ6fptbOuh9gycsbDD1E=`; POST `https://example.com/webhook?tenant=demo` + `{"description":"Café 😀"}` → `NPtCw8JeuWuvFKLIxwoxHQmAkV0=`). A reverse proxy must not alter host/scheme/path; use the public URL TextGrid called.

## 7. Errors worth recognising

`{"errorCode": 1401|1402}` GHL-connected account without API permission → contact support (don't retry).
`21606` bad/non-SMS `from`; `21610` blacklist (opt-out) for the from/to pair — don't switch senders to bypass;
`4403` MMS not enabled; `4303` empty recipient. 401 on a valid token can mean a missing permission. Message
bodies: "Balance is below 0…", "Invalid Parameter values." (often wrong content type), "International traffic is not
allowed", "Not authorized to use Bulk SMS". Error shapes vary (`code`+`message`, `Message`, `error`, bare string, empty)
— check HTTP status and Content-Type first and tolerate empty bodies.

## 8. Dashboard ↔ docs notes (what this review found)

- **Webhook signing is documented** (the old route comment said it wasn't). `/api/webhooks/textgrid` now accepts a valid
  signature *or* the legacy `?secret=`. Only the platform account's secret (`TEXTGRID_WEBHOOK_SECRET`) is verifiable:
  per-client sub-account **webhook secrets are returned at creation but not stored** (no column), so their events rely on
  the `?secret=` fallback. Storing them is the proper fix.
- **Sole-proprietor**: the docs say unsupported; `textgridProvider.ts` still contains SMS-OTP calls from an older doc. Verify with TextGrid before relying on it.
- Edit-campaign body has a `resubmit` flag; the docs don't say whether it triggers resubmission — the dashboard uses the dedicated `/resubmit` route instead.
- Not documented anywhere reviewed: SID encoding, rate-limit numbers, brand `identityStatus` enum beyond `UNVERIFIED`, the campaign `status` enum, `SecondaryDcaSharingStatus` values, decline-reason list, TCREvent names, registration/appeal fee amounts. Those come from observation (see §3) — re-verify when they matter.
- Basic and Bearer both work; the old comment in `textgridClient.ts` implying Bearer-only is outdated but harmless.
