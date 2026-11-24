// Registration policy: every campaign is submitted as MARKETING. The only
// exception is a non-profit 527 political campaign, which is POLITICAL — and
// those are set up by an admin, never picked by a client. Declines like
// "Opt in mentions marketing, use case selected is Account notification" come
// from a use case that doesn't match the opt-in language, and TextGrid does not
// let a campaign's use case be edited after creation, so the fix is to never
// let the wrong one be submitted in the first place.

export const MARKETING_USE_CASE = "MARKETING";
export const POLITICAL_USE_CASE = "POLITICAL";

/** What clients (intake form, customer dashboard) may submit. */
export const CUSTOMER_USE_CASES = [MARKETING_USE_CASE];

/** What an admin may set — adds POLITICAL for non-profit 527 campaigns. */
export const CAMPAIGN_USE_CASES = [MARKETING_USE_CASE, POLITICAL_USE_CASE];

/**
 * Server-side guard for client-facing submissions: whatever the form posted
 * (or whatever an old draft row holds), a client campaign is MARKETING.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept so call sites document what they're overriding
export function resolveCustomerUseCase(_requested?: string | null): string {
  return MARKETING_USE_CASE;
}

/** Admin dropdown options: the policy list, plus the campaign's current value so an existing legacy campaign still displays correctly. */
export function adminUseCaseOptions(current?: string | null): string[] {
  return current && !CAMPAIGN_USE_CASES.includes(current) ? [...CAMPAIGN_USE_CASES, current] : CAMPAIGN_USE_CASES;
}
