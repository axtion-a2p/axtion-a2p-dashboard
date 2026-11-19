// Per-site overrides for clients whose compliance micro-site is NOT a generic
// "sign up for text alerts" page. A "lead-gen" site is a marketing lead-capture
// page: visitors submit their contact details to receive offers from the business,
// and text messaging is a separate, optional consent on that form. This is keyed by
// subdomain (rather than derived from the brand vertical) on purpose — changing
// copy for every FINANCIAL client at once would alter sites that are already
// approved or mid-carrier-review. Move this onto a SubAccount column when more
// sites need it.

import { optInCategoriesFor, type OptInCategory } from "@/lib/optInCategories";

export type LeadGenProfile = {
  kind: "lead-gen";
  /** Short label for the nav link and the primary button. */
  cta: string;
  badge: string;
  headline: (businessName: string) => string;
  subtext: (businessName: string) => string;
  /** What the business is, in one sentence — used on the form page and in the policies. */
  about: (businessName: string) => string;
  /** What people receive after submitting the form, e.g. "capital options". */
  offering: string;
  /** What marketing texts are about, e.g. "our funding products" (privacy policy). */
  smsTopic: string;
  /** Short caveat shown beside the main button and on the form, or "" for none. */
  disclaimer: string;
  /** Sentence appended to the intro on the form page (leading space included), or "". */
  optinNote: string;
  /** Appended to "consent is not a condition of purchase", e.g. " or of receiving funding". */
  consentSuffix: string;
  /** Completes "Submitting our form is a request to receive information about X; it ..." in the terms. */
  termsNote: string;
  /** The two business-specific FAQ entries shown first on the landing page. */
  faqs: (businessName: string) => { q: string; a: string }[];
  /**
   * Optional wording overrides for sites whose request is not "get <offering>" (e.g. a demo
   * call). Anything left out falls back to the default text derived from `offering`.
   */
  copy?: {
    steps?: (businessName: string) => { title: string; description: string }[];
    services?: { heading: string; items: { title: string; description: string }[]; footnote: string };
    closing?: (businessName: string) => { heading: string; text: string };
    formTitle?: (businessName: string) => string;
    formIntro?: (businessName: string) => string;
    submitLabel?: string;
    successMessage?: (businessName: string) => string;
    termsHeading?: string;
    termsBody?: (businessName: string) => string;
    privacyUse?: string;
  };
};

const NEXGEN: LeadGenProfile = {
  kind: "lead-gen",
  cta: "Get Capital Options",
  badge: "Business Funding",
  headline: (name) => `Capital options for your business from ${name}`,
  subtext: (name) =>
    `${name} is a direct lender. Tell us a little about you and your business, and we'll follow up with capital options that may fit your needs.`,
  about: (name) => `${name} is a direct lender that provides business funding.`,
  offering: "capital options",
  smsTopic: "our funding products",
  disclaimer: "Funding subject to review and approval.",
  optinNote: " Funding is subject to review and approval.",
  consentSuffix: " or of receiving funding",
  termsNote:
    "is not an application for, or a commitment to accept, any funding. Funding is subject to review and approval, and any offer will be provided to you separately.",
  faqs: (name) => [
    {
      q: `Is ${name} a direct lender?`,
      a: `Yes. ${name} is a direct lender — we provide funding ourselves rather than passing your information along to a marketplace of other lenders.`,
    },
    {
      q: "Does submitting the form commit me to anything?",
      a: "No. Submitting the form is a request to hear about your options. Funding is subject to review and approval, and you decide whether to move forward.",
    },
  ],
};

const AXTION: LeadGenProfile = {
  kind: "lead-gen",
  cta: "Schedule a Demo",
  badge: "Communications CRM",
  headline: (name) => `Schedule a demo call with ${name}`,
  subtext: (name) =>
    `${name} provides a communications CRM with a shared inbox, AI-powered follow-up, automations and pipeline tracking. Request a demo call below and a team member will reach out to schedule it.`,
  about: (name) =>
    `${name} provides Axtion, a communications CRM — a shared inbox, AI-powered follow-up, automations and pipeline tracking — for teams that organize outreach and respond with context.`,
  offering: "a demo call",
  smsTopic: "our products and services",
  disclaimer: "",
  optinNote: "",
  consentSuffix: "",
  termsNote: "is not a purchase and does not commit you to anything.",
  faqs: (name) => [
    {
      q: `What is ${name}?`,
      a: `${name} provides Axtion, a communications CRM based in Phoenix, Arizona. Teams use it to bring calls, SMS, email and social conversations, leads and AI-powered follow-up into one workspace.`,
    },
    {
      q: "What happens after I submit the form?",
      a: "A member of our team contacts you at the email address or phone number you provide to schedule your demo call. Submitting the form does not commit you to anything, and you decide whether to move forward.",
    },
    {
      q: "What will the demo cover?",
      a: "A walkthrough of the Axtion platform — the shared inbox, AI follow-up, automations and pipeline — and the plan options, with time for your questions.",
    },
  ],
  copy: {
    steps: (name) => [
      { title: "Request a demo", description: "Share your name, email and mobile number through our short secure form." },
      { title: "We reach out", description: `A ${name} team member contacts you to schedule your demo call.` },
      { title: "See the platform", description: "On the call we walk through Axtion's inbox, AI follow-up, automations and pipeline, and answer your questions." },
    ],
    services: {
      heading: "What Axtion offers",
      items: [
        { title: "Shared inbox", description: "Bring calls, SMS, email and social conversations into one team view, tied to the contact." },
        { title: "AI follow-up", description: "Configure AI assistants around your team's process to respond to and follow up with leads." },
        { title: "Automations", description: "Set up workflows so every lead gets a response, a next step and an owner." },
        { title: "Pipeline & contacts", description: "Keep contact details, activity, tasks and ownership together, and see opportunities move through stages." },
        { title: "Calendars & forms", description: "Capture leads from forms and use calendars to move interested people to a conversation." },
      ],
      footnote:
        "Built for real estate investors, insurance and financial services teams, political and advocacy teams, and agencies and growth teams. See the full platform and plans at axtion.ai.",
    },
    closing: (name) => ({
      heading: "Ready to see Axtion in action?",
      text: `Request a demo call with ${name} in under a minute.`,
    }),
    formTitle: (name) => `Schedule a demo call with ${name}`,
    formIntro: (name) =>
      `${name} provides Axtion, a communications CRM. Submit your details below to request a demo call — a ${name} team member will contact you to schedule it.`,
    submitLabel: "Request my demo call",
    successMessage: (name) =>
      `Thank you — we've received your demo request and a ${name} team member will contact you to schedule your call. If you agreed to text messages, reply STOP at any time to opt out.`,
    termsHeading: "Demo call requests",
    termsBody: (name) =>
      `${name} provides Axtion, a communications CRM. Submitting our form is a request to schedule a demo call with ${name}; it is not a purchase and does not commit you to anything. A team member will contact you at the email address or phone number you provide to arrange the call.`,
    privacyUse:
      "We use your contact details to respond to your request and to contact you to schedule your demo call. If you separately agree to receive text messages, we use your mobile number to send you marketing and promotional SMS messages about our products and services. Submitting the form does not require you to agree to text messages.",
  },
};

const PROFILES: Record<string, LeadGenProfile> = {
  nexgencapllc: NEXGEN,
  axtionllc: AXTION,
};

export function siteProfile(subdomain: string | null | undefined): LeadGenProfile | null {
  return (subdomain && PROFILES[subdomain]) || null;
}

/** Consent boxes for a site's opt-in form: a lead-gen site always shows its marketing consent. */
export function siteOptInCategories(
  profile: LeadGenProfile | null,
  useCases: string[],
  program?: string | null,
): OptInCategory[] {
  return profile ? ["MARKETING"] : optInCategoriesFor(useCases, program);
}
