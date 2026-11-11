# TextGrid API reference (as used by this dashboard)

Reviewed against https://docs.textgrid.com on 2026-11-11 — Getting Started, the `llms.txt` index, every
reference menu (Accounts, Phone numbers, Messaging, 10DLC, Voice, Webhooks) and the guides behind them. Where the docs are silent this says so — don't fill
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
| Send email | `POST /Accounts/{accountSid}/email` — see §5. |

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

**Response shapes & success codes (all read from the reference pages)**

- `CampaignDetailsResponse` (every campaign GET): `campaignId, cspId, resellerId, status, brandId, brandName, brandStatus, usecase, subUsecases[], description, referenceId, messageFlow, sample1-5, help/optin/optout keywords+messages, privacyPolicyLink, termsAndConditionsLink`, booleans `autoRenewal, embeddedLink, embeddedPhone, affiliateMarketing, numberPool, ageGated, directLending, subscriberOptin/Optout/Help, mock, campaignEnabled`, carrier fields `attMsgClass, attTPMScope, attTTPM, attSurcharge, tMobileBrandTier, tMobileBrandDailyCap`, `quarterlyFee`, `numbersConnected`, `accountSid, accountName, campaignName`, dates `createDate, billedDate, dateCreated, dateDisabled`, and the review fields **`SecondaryDcaSharingStatus`, `SecondaryDcaDeclineReason`, `SecondaryDcaDeclineExplanation`, `SecondaryDcaDeclineSuggestion`** (all free-form strings; the dashboard now surfaces reason + explanation + suggestion on a decline). **No enum is documented for `status`, `brandStatus` or any SecondaryDca field** — `"queued"` in the examples is a placeholder, don't hard-code from it.
- `GET /campaigns/number/{phoneSid}/campaign` returns **one object** (campaign + `phoneNumber`, `phoneNumberSid`) despite the "Campaigns" title; `GET /campaigns/number/{campaignId}` returns an array of `{accountSid, phoneNumber, phoneNumberSid, campaignId, campaignName, campaignEnabled, dateCreated}` — there's no per-number attachment-status field, only `campaignEnabled`.
- Success codes differ: GETs 200, **deactivate campaign 204**, **delete brand 204**, **detach number 200 (no body)**, attach numbers 200 (no body), **CTA/MMS media 202**. Only brand-by-id, campaign-by-id and campaign-by-phone document a 404; error bodies `{"Error": …}` (lowercase `error` on some 400s) and may be empty. List endpoints (`/campaigns/brand`, `/campaigns/campaign`) have no pagination or filters.
- `BrandDetailsResponse` (brand GETs): the create-brand fields + `status`, `identityStatus`, `vettedDate`, `accountSid, dateCreated, dateUpdated, dateDisabled`. `identityStatus`/`status` are free-form strings with no documented values (only `UNVERIFIED` is named in the guide). Edit brand (`PUT /campaigns/brand`) takes the same fields plus a `revet` boolean (undocumented) with `brandId` in the body.
- **Vetting**: `POST /campaigns/brand/{brandId}/externalVetting` `{evpId, vettingClass, additionalRequestPayload{…political-vetting fields}}` and `PUT …/externalVetting` `{evpId, vettingId, vettingToken}` both return `{evpId, vettingId, vettingToken, vettingScore, vettingClass, vettingStatus, reasons[], vettedDate, createDate}`.
- **Enums**: usecase and vertical return a nested map (object of objects of strings); entityType, brandRelationship, altBusinessIdType and stockExchange return string arrays. The reference shows only placeholders — **call them live** rather than copying values from docs.
- CTA/MMS attachment body: `{File (base64, required), FileName, MimeType, UUID?, ID?}`.

Errors: 400 `{"error": …}` or `{"Error": …}` (handle both casings; value is sometimes a JSON-encoded string), 401, 404 `{"Error": …}`, 500 `{"Error": …}`.

**Registration webhook** (`registrationEvent`): configured in the TextGrid Dashboard (not the API). `POST` JSON
to your URL with `?TCREvent=<event>` appended. Body: `cspId, brandName, brandReferenceId, brandId, description,
evpName, eventType, evpId, vettingId, cspName, dcaId, campaignId, dcaName, mock, campaignReferenceId`
(+ possibly extra provider fields — ignore unknowns). Event names are **not documented**; treat as opaque.
Respond 200. No retries — reconcile by fetching the brand/campaign.

## 4. Phone numbers, caller ID, forwarding, lookup

All under `/Accounts/{accountSid}`. Response field names are **snake_case** while request fields are **camelCase**.

| Operation | Details |
|---|---|
| Search local | `GET …/AvailablePhoneNumbers/{isoCountryCode}/Local.json?areaCode=480` — `areaCode` is the only filter; no pagination/max documented; doesn't reserve. Items: `friendly_name, phone_number, lata, rate_center, region, iso_country, beta, capabilities`. |
| Buy | `POST …/IncomingPhoneNumbers.json` — **form or query** fields (all optional in the spec; which of `phoneNumber`/`areaCode` is required isn't stated): `phoneNumber, areaCode, friendlyName, voiceApplicationSid, smsApplicationSid, smsUrl, smsMethod, smsFallbackUrl, smsFallbackMethod, voiceUrl, voiceMethod, voiceFallbackUrl, voiceFallbackMethod, voiceCallerIdLookup, statusCallback, statusCallbackMethod`. Billable; permission/balance apply. On timeout list numbers before retrying — a retry can buy a second number. |
| List | `GET …/IncomingPhoneNumbers.json?Page=0&PageSize=50&phoneNumber=&friendlyName=` (zero-based; no max PageSize). |
| Get | `GET …/IncomingPhoneNumbers/{phoneNumberSid}.json` |
| Update | `POST …/IncomingPhoneNumbers/{phoneNumberSid}.json` form/query: `friendlyName, smsUrl, smsMethod, smsFallbackUrl, smsFallbackMethod, voiceUrl, voiceMethod, voiceFallbackUrl, voiceFallbackMethod, voiceCallerIdLookup, statusCallback, statusCallbackMethod, ghlDefault`. Can't change number/areaCode/application SIDs. **Not documented whether omitted fields are kept or reset to `""` — test before relying on partial updates.** |
| Release | `DELETE …/IncomingPhoneNumbers/{phoneNumberSid}.json` → 200, no body (may not be re-acquirable; detach from campaign separately). |
| Caller ID | `POST …/CallerID.json` **JSON** `{phoneNumber (required), friendlyName?}` → number record. Needs account permission — **401 even with valid creds when not enabled**; 400 can mean balance/payment-method. Voice caller ID only: not an SMS sender, doesn't port/purchase. |
| Auto-forward | `POST|GET …/IncomingPhoneNumbers/{phoneNumberSid}/forward.json` **JSON** `{forwardTo, forwardEnabled, forwardRecord, ghlDefault}`; POST → 200 no body; GET returns the same four fields. While enabled, `voiceUrl` is never requested. |
| Lookup | `GET https://lookups.textgrid.com/v1/PhoneNumbers/{+E164}?type=carrier\|caller-name\|carrier,caller-name&countryCode=US` → `phone_number, national_format, country_code, carrier{name,type,mobile_country_code,mobile_network_code,error_code}, caller_name{caller_name,caller_type,error_code}, add_ons, url`. Spec says Bearer, guide's curl uses Basic — try both. Keep MCC/MNC as strings. Separate lookups allowance ("Account has reached Lookups limit."). Results ≠ consent or deliverability. |

`IncomingPhoneNumberResponse`: `sid, account_sid, friendly_name, phone_number, voice_url/method, voice_fallback_url/method, sms_url/method, sms_fallback_url/method, status_callback(+_method), capabilities{voice,outgoing_voice_only,sms,outgoing_sms_only,mms}, beta, api_version, uri, status, date_created, date_updated, campaignId, campaignName, connectionStatus, ghlDefault`.

Errors: 400 `{"Message"}` (or a bare string), 401, 404 `{code,status,message,more_info?}`, 500 `{"Message"}`.

## 5. Messaging & email

- **Send** `POST …/Messages.json` JSON `{from, to, body | mediaUrl[], statusCallback?}` — `from` must be a number registered and enabled for the account; body non-empty unless `mediaUrl` has ≥1 item. MMS needs account + number enablement (`4403`). Media URLs: direct download, no auth, keep up ≥3 days; JPEG/PNG/GIF, MP3, MP4, PDF, VCF; under ~300 KB recommended. Response `MessageResponse`: `sid, account_sid, body, from, to, direction, status, error_code, error_message, num_segments, num_media, num_images, price, surcharge, price_unit, date_created/updated/sent, messaging_service_sid, api_version, email, carrierNetwork, messageClass, uri, subresource_uris.media` — numerics are **strings**; `error_message` can be absent even when failed. Success ≠ delivery; no scheduled sends.
- **Read** `GET …/Messages/{sid}.json`; **list** `GET …/Messages.json?Page&PageSize&To&From&DateSent&DateSent>&DateSent<` (`yyyy-MM-dd`, account time zone; the spec text says `>=`/`<=` — inclusivity unresolved; use either the exact date or a range, not both). Follow `next_page_uri` until absent, dedupe by `sid`. **409 "Please wait for existing API call to finish"** → let the outstanding request finish, then retry. **Media** `GET …/Messages/{sid}/Media.json` → `Medias[]` (`sid, parent_sid, content_type, uri, dates`) — metadata only.
- **Status** is `"state - description"` (split on the first `" - "`); states `queued, sent, pending, delivered, failed, undelivered` (+`received` inbound). See delivery-status-reference for ~100 description strings and retry guidance.
- **Bulk** `POST …/BulkMessages.json` JSON `{"Messages":[{to, body (may be ""), from?, statusCallback?, mediaUrl[]?}]}` — ≥1 item, **30 MB total** request limit (no fixed count), needs support enablement (else **401** "Not authorized to use Bulk SMS"). Returns an array of per-message results; HTTP 200 ≠ all succeeded. No idempotency key or client reference, order not guaranteed → correlate by `sid`/`to`. On timeout/500 **don't resend the batch** — reconcile via logs.
- **Opt-in/out** (not under `/Accounts`, no `.json`): `GET /optin/{endUserNumber}/{direction}/{senderNumber}` (`direction` = `in`|`out`, inferred; GET that changes state!) → `{action}`; `POST /optin/{direction}/{senderNumber}/{notifyRecipient}` body = JSON array of E.164 strings → `{action: [..]}` (`notifyRecipient` boolean controls a confirmation text; default/text undocumented); `GET /optin/status/{endUserNumber}/{senderNumber}/{method}` (`method`=`any`) → `{action, date, verb}`. Keywords handled by TextGrid when enabled: STOP/STOP!/STOPALL/UNSUBSCRIBE/END/QUIT/QUIT! = out; START/UNSTOP = back in; HELP = help only. They still reach your webhook; don't double-reply. A blocked send fails with a blacklist error — switching sender numbers doesn't help.
- **Email** `POST /Accounts/{sid}/email` JSON `{body (required), to|cc|bcc (≥1; comma/semicolon-separated strings), from?, fromName?, replyto?, subject?, isBodyHtml? (default true)}` → `{Success, ErrorMessage, EmailID}`. Needs enablement (else 400 "Email is disabled for this account"); **HTTP 200 can carry `Success:false`**; no attachments; on timeout check before retrying.
- Limits: daily allowance shared across sub-accounts (Dashboard → Overview → Messaging limits); `403 "SMS Sending Limit reached"` single / `400` bulk — stop, don't loop; throughput is throttled per campaign to AT&T's per-minute limit (queued ≠ error; don't resubmit). HTTP 429 → back off with jitter, honor `Retry-After`.

## 6. Voice

- **Create call** `POST …/Calls.json` JSON — required `From`, `To`; optional `Url, Method, StatusCallback, StatusCallbackMethod, ApplicationSid, FallbackUrl, FallbackMethod, SendDigits, IfMachine, Timeout, MachineDetection(+Timeout/SpeechThreshold/SpeechEndThreshold/SilenceTimeout), Record (default false), SipAuthUsername/Password, VoiceMailDrop, VMDDelay`. A 2xx ≠ answered; a timed-out POST may have created a call (check before retrying). `From` must be a TextGrid number or registered caller ID.
- **Read** `GET …/Calls/{callSid}.json` (adds `digits_pressed`) and list `GET …/Calls.json?Page&PageSize&To&From&Status(queued|in-progress|failed|completed|busy|no-answer)&StartTime[>|<]&EndTime[>|<]&ParentCallSid` (dates `yyyy-MM-dd`; **the Page param text says "starting with 1" but default/guide are zero-based — verify**). Call `duration` is seconds; legs link via `parent_call_sid`. Dates are account-local with a literal `+0000`.
- **Recordings**: request with `Record:true` (create) or `<Dial record="true">` (standalone `<Record>` can't start one); `POST …/Calls/{callSid}/Recordings.json` body `{}` while in progress (200 started; 404 not found; **406 not in progress**; 502 couldn't start; response is PascalCase `Sid…`); `GET …/Recordings.json` (`PageSize` 1–1000, `CallSid`, `DateCreated[>|<]`), `GET …/Recordings/{recordingSid}.json`, download `…/Recordings/{recordingSid}.wav` (the guide shows no extension — verify). Metadata can exist before audio; 404 is ambiguous (not found vs not ready). WAV only.
- **TwiML verbs implemented**: Say, Dial, Gather (DTMF only), Play, Pause, Redirect, Hangup, Ring. **Not supported**: speech recognition, `<Stream>`, SIP/trunking; `Client`/SIP/named `Conference` in Dial not established. Hangup on a conference ends it.
- Voice errors: 409 wait-and-retry on list calls; 400 can be an account voice restriction.

## 6b. Webhook payloads (TextGrid → you)

All carry `ApiVersion=2010-04-01` and `X-TextGrid-Signature`; POST = form fields, GET = same as query; integers arrive as text.

| Callback | Goes to | Key fields / rules |
|---|---|---|
| Incoming message | number `smsUrl` (POST default) | `MessageSid=SmsSid=SmsMessageSid, AccountSid, From, To, Body?, NumMedia, NumSegments, SmsStatus=received, MediaUrlN/MediaContentTypeN`. Ack 200/201/202/204; reply TwiML or empty `<Response/>`. 2 attempts only on transport status 0 (1 s apart), then SMS Fallback once; 15 s timeout. |
| Message status | per-message `statusCallback` (POST) else number `statusCallback` (GET/POST) | `MessageSid, MessageStatus=SmsStatus, SmsStatusDetail?, Segments, To, From`. **One attempt**, no retry/fallback. `pending` ≠ failure. |
| Voice instructions | number `voiceUrl` / call `Url` | `CallSid, AccountSid, From, To, CallStatus=ringing, Direction=inbound\|outbound` → return TwiML (`application/xml`). |
| Gather | Gather `action` else instruction URL | + `Digits` (string — keep leading zeros), `CallStatus=in-progress`. |
| Machine detection | outgoing `Url` | `Direction=outbound`, `AnsweredBy=human\|machine_start\|machine_end_beep\|machine_end_other`, optional lowercase `reason`. |
| Redirect | `<Redirect>` target (POST default) | same core fields, `CallStatus=in-progress`. |
| Voice status (final) | number/call `StatusCallback` | `CallStatus=completed\|busy\|no-answer\|failed`, **`Direction=inbound\|outbound-api`** (not `outbound`), `Called, Caller` (completion only), `Timestamp`, `Duration` (**minutes**, rounded up) / `CallDuration` (seconds) — both omitted on failure, `SipResponseCode` 200/400/404, `SequenceNumber`=0, optional `Digits`. 200 only, once, duplicates possible → be idempotent. |
| 10DLC registration event | URL configured in Dashboard | JSON, required `?TCREvent=`; see §3. |

Idempotency: key on `MessageSid` (incoming) or message ID + status; persist before acking, process afterwards. If forwarding is on, `voiceUrl` isn't called. Source IPs: `4.154.12.229, 13.66.251.110, 20.115.164.8, 20.191.85.152`.

## 6c. Webhook signature

header `X-TextGrid-Signature`, keyed by the **Webhook Secret** (not the Auth Token; used verbatim, not Base64-decoded):
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
- Decline detail: campaign GETs also return `SecondaryDcaDeclineExplanation` and `SecondaryDcaDeclineSuggestion` (beyond `…Reason`); `textgridProvider.ts` now folds all three into the stored failure reason.
- Direction values differ by callback (`outbound` for instruction webhooks, `outbound-api` for final status); `Duration` webhook field is minutes, `CallDuration`/call-log `duration` are seconds.
- Open verification items (docs conflict or are silent): call-list `Page` base (0 vs 1), recording download extension (`.wav` vs none), `DateSent>`/`<` inclusivity, opt-in `direction`/`notifyRecipient` values, whether Update-number resets omitted fields, Basic vs Bearer for lookups.
- Basic and Bearer both work; the old comment in `textgridClient.ts` implying Bearer-only is outdated but harmless.
