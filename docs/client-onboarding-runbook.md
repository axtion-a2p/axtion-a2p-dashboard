# Client onboarding runbook

The exact sequence that took Dean Capital LLC from sign-up to an approved,
number-attached campaign — use this for every new client. Each step links to
where it happens; the admin dashboard's "Onboarding" checklist (top of
`/admin/{id}`) tracks these same steps against live data.

## 1. Create the sub-account

`/signup` — business name, contact name/email, default provider. This
auto-generates:

- A `/d/{token}` client dashboard link (share this with the client, or fill it
  in yourself on their behalf — that's what we did for Dean Capital).
- A compliance micro-site subdomain (`{slug}.axtion.app`) with live
  Terms/Privacy/Opt-in pages, themed off industry once the brand's vertical is
  set (step 2).

## 2. Submit the brand

On `/d/{token}`, under **Brand registration**, pick **Submit via** (TextGrid or
Twilio) and fill in the real business info: legal name, EIN, business type,
**industry/vertical** (this drives the compliance site's theme — pick the one
that actually matches the client, e.g. `REAL_ESTATE`), address, business
contact, and authorized representative.

TextGrid brands have historically approved near-instantly (Dean Capital: same
day). Twilio's review is async and can take longer — submit it too if the
client wants both, using the same "Submit via" dropdown once TextGrid's brand
is in and you're ready (a sub-account can hold a brand under both providers at
once, chosen independently).

## 3. Submit the campaign

Once a brand shows **Approved**, the **Campaigns** section unlocks a
submission form. Click **Use standard Marketing template** — it auto-fills:

- Description and opt-in details referencing the client's *real* live
  compliance site (`{slug}.axtion.app/optin`)
- Two compliant sample messages
- Terms/Privacy links pointing at the real `/terms` and `/privacy` pages
- Opt-in/opt-out/help confirmation messages

Review the fields, then **Submit campaign**. Pick **Submit via** to match
whichever brand you're building on. TextGrid campaigns have also approved
near-instantly so far.

## 4. Get a phone number attached

On `/admin/{id}` → **Phone numbers**:

1. Pick a provider and search by area code. If the client's requested area
   code has nothing available, nearby codes usually do (Dean Capital asked for
   917; nothing was available there at signup time, so we used 631 — same
   region, and later 917 opened up and we attached a second number once it
   did).
2. **Buy & assign** — pick the matching approved campaign in the dropdown to
   purchase and attach in one step.

A campaign needs at least one number attached before it can actually carry
traffic — treat this as a required step, not an optional add-on.

## 5. Confirm the loop closed

- Visit `{slug}.axtion.app` — hero copy should match the client's actual
  industry (see step 2), and `/terms`, `/privacy`, `/optin` should all load.
- `/optin` should show one consent checkbox per use case actually submitted
  (e.g. a `MARKETING` campaign shows the marketing checkbox, not a generic
  one) — if it's still showing the generic fallback, the campaign submission
  in step 3 didn't go through.
- `/admin/{id}` should show: brand Approved, campaign Approved/Healthy, at
  least one number listed against that campaign.

## Notes from the Dean Capital run

- We didn't need to fabricate anything for TCR — the standard Marketing
  template's opt-in details/links work because the compliance site is real
  and live before the campaign is ever submitted. Don't submit a campaign
  before the sub-account has a subdomain assigned.
- A sub-account is not locked to one carrier. If a client needs both Twilio
  and TextGrid (e.g. Twilio for redundancy, or because one rejects a brand),
  submit to both from the same sub-account rather than creating a second one.
- If a number's own SID contains a `~` character, TextGrid's API has been
  unreliable referencing it in later calls (a platform-side quirk, not
  ours) — the *assignment* itself still works, just don't be surprised if a
  direct GET/POST on that specific SID 500s later.
