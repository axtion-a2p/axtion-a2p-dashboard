import { subdomainUrl } from "./subdomain";

/**
 * Standard, TCR-compliant "Marketing" campaign template. Reused across
 * clients rather than writing sample messages/opt-in language from scratch
 * for every submission — only the business name and subdomain vary.
 */
export function marketingCampaignTemplate(businessName: string, subdomain: string) {
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
    optinMessage: `You are now subscribed to ${businessName} marketing alerts. Msg frequency may vary. Reply HELP for help, STOP to opt out. Msg&Data rates may apply.`,
    optoutMessage: `You have been unsubscribed from ${businessName} alerts and will not receive further messages. Reply START to resubscribe.`,
    helpMessage: `${businessName} Support: Reply STOP to unsubscribe. Contact us for help. Msg&Data rates may apply.`,
    hasEmbeddedLinks: false,
    hasEmbeddedPhone: false,
  };
}
