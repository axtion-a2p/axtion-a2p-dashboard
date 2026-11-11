# Provisioning API (Replit checkout → dashboard)

`POST /api/provision` — called by the Replit checkout app after each **successful** payment. Creates the client's
dashboard sub-account plus a dedicated **Twilio subaccount** and a dedicated **TextGrid sub-account**.

## Setup
- Set `PROVISION_API_SECRET` on Vercel (long random string) and give the same value to the Replit app. Unset → the endpoint answers 503.
- Twilio: `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` must be the **main account's** (API keys can't create subaccounts).
- TextGrid: the master `TEXTGRID_ACCOUNT_SID` / `TEXTGRID_AUTH_TOKEN` are used to create the sub-account.

## Request
```
POST /api/provision
Authorization: Bearer $PROVISION_API_SECRET
Content-Type: application/json

{ "externalRef": "<payment/checkout id>",      // required — idempotency key
  "businessName": "Acme LLC",                  // required
  "contactEmail": "owner@acme.com",
  "contactName": "Pat Owner",
  "provider": "TWILIO",                         // primary provider for the dashboard row; default TWILIO
  "ghlLocationId": "...", "ghlLocationName": "..." }
```

## Responses
| Status | Meaning | Replit should |
|---|---|---|
| 201 | Created; both accounts exist | store `dashboardUrl` |
| 200 | Same `externalRef` seen before; both accounts exist | nothing (safe replay) |
| 202 | Another request for this payment is mid-flight | retry shortly |
| 502 | One provider failed; the other was kept (`errors[]` says which) | **retry** — only the missing account is created |
| 409 | Business name already exists under a different `externalRef` | surface to a human; body has `existingDashboardUrl` |
| 400 / 401 / 503 | Bad body / bad secret / not configured | fix and resend |

Body on 2xx/502: `{ outcome, subAccountId, dashboardUrl, twilioAccountSid, textgridAccountSid, errors, alreadyExisted }`.
Auth tokens are never returned; they are stored on the `SubAccount` row (`twilioAuthToken`, `textgridAuthToken`,
`textgridWebhookSecret`) and used automatically by every provider call via `getProviderFor()`.

## Notes
- Idempotency: `SubAccount.externalRef` is unique; a 2-minute lease (`provisionLockedAt`) stops concurrent retries
  from both creating accounts. Each account's credentials are saved the instant it is created.
- Creating the accounts does **not** register a brand or campaign. A new Twilio subaccount has no Trust Hub Primary
  Customer Profile (Twilio only lets a human create one, in the console), so A2P brand submission on it needs that first.
