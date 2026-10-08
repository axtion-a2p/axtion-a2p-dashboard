import { subdomainUrl } from "./subdomain";

export type CampaignTemplate = {
  useCase: string;
  description: string;
  optInDetails: string;
  sampleMessages: string[];
  termsAndConditionsLink: string;
  privacyPolicyLink: string;
  optinMessage: string;
  optoutMessage: string;
  helpMessage: string;
  hasEmbeddedLinks: boolean;
  hasEmbeddedPhone: boolean;
};

/**
 * The opt-in/opt-out/help confirmation texts are boilerplate required by
 * every campaign regardless of use case — auto-generate them everywhere
 * (templates, the intake form) instead of asking a client to write SMS
 * compliance copy themselves, which is exactly where a submission goes wrong.
 */
export function standardOptInOutHelp(businessName: string): Pick<CampaignTemplate, "optinMessage" | "optoutMessage" | "helpMessage"> {
  return {
    optinMessage: `You are now subscribed to ${businessName} updates. Msg frequency may vary. Reply HELP for help, STOP to opt out. Msg&Data rates may apply.`,
    optoutMessage: `You have been unsubscribed from ${businessName} updates and will not receive further messages. Reply START to resubscribe.`,
    helpMessage: `${businessName} Support: Reply STOP to unsubscribe. Contact us for help. Msg&Data rates may apply.`,
  };
}

/**
 * Standard, TCR-compliant "Marketing" campaign template. Reused across
 * clients rather than writing sample messages/opt-in language from scratch
 * for every submission — only the business name and subdomain vary.
 */
export function marketingCampaignTemplate(businessName: string, subdomain: string): CampaignTemplate {
  const optinUrl = subdomainUrl(subdomain, "/optin");
  const termsAndConditionsLink = subdomainUrl(subdomain, "/terms");
  const privacyPolicyLink = subdomainUrl(subdomain, "/privacy");

  return {
    useCase: "MARKETING",
    description: `${businessName} sends marketing messages to customers who opt in, including promotions, offers, and updates about our products and services. Message frequency may vary.`,
    optInDetails: `Customers opt in by submitting the SMS sign-up form at ${optinUrl}, where they check a box agreeing to receive marketing text messages from ${businessName}.`,
    sampleMessages: [
      `Hi {name}, thanks for signing up with ${businessName}! Reply HELP for help, STOP to opt out.`,
      `${businessName}: Check out our latest offer! Msg&Data rates may apply. Reply STOP to opt out.`,
    ],
    termsAndConditionsLink,
    privacyPolicyLink,
    ...standardOptInOutHelp(businessName),
    hasEmbeddedLinks: false,
    hasEmbeddedPhone: false,
  };
}

/**
 * Standard "Low Volume" campaign template — Twilio/TCR's reduced-vetting tier
 * for businesses that won't exceed the low-volume throughput threshold
 * (currently under 6,000 messages/day). Same compliant structure as the
 * Marketing template (real opt-in page, real Terms/Privacy links) but the
 * description and samples are framed as general low-volume business/account
 * communication rather than promotional marketing, since that's what the
 * use case itself represents to TCR vetting.
 */
export function lowVolumeCampaignTemplate(businessName: string, subdomain: string): CampaignTemplate {
  const optinUrl = subdomainUrl(subdomain, "/optin");
  const termsAndConditionsLink = subdomainUrl(subdomain, "/terms");
  const privacyPolicyLink = subdomainUrl(subdomain, "/privacy");

  return {
    useCase: "LOW_VOLUME",
    description: `${businessName} sends low-volume account and business updates to customers who opt in — confirmations, status updates, and occasional offers. Expected send volume is under the low-volume threshold (fewer than 6,000 messages/day).`,
    optInDetails: `Customers opt in by submitting the SMS sign-up form at ${optinUrl}, where they check a box agreeing to receive text messages from ${businessName}.`,
    sampleMessages: [
      `Hi {name}, thanks for signing up with ${businessName}! Reply HELP for help, STOP to opt out.`,
      `${businessName}: Your request has been received and is being processed. Msg&Data rates may apply. Reply STOP to opt out.`,
    ],
    termsAndConditionsLink,
    privacyPolicyLink,
    ...standardOptInOutHelp(businessName),
    hasEmbeddedLinks: false,
    hasEmbeddedPhone: false,
  };
}

const TEMPLATES_BY_USE_CASE: Record<string, (businessName: string, subdomain: string) => CampaignTemplate> = {
  MARKETING: marketingCampaignTemplate,
  LOW_VOLUME: lowVolumeCampaignTemplate,
};

/** Returns the standard template for a use case, or undefined if none exists yet for it. */
export function campaignTemplateFor(useCase: string, businessName: string, subdomain: string): CampaignTemplate | undefined {
  return TEMPLATES_BY_USE_CASE[useCase]?.(businessName, subdomain);
}
