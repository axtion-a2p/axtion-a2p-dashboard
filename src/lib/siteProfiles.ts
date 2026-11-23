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
  /** Replaces "marketing and promotional messages" in the opt-in consent statement, e.g. "political campaign messages". */
  smsSubject?: string;
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
      { title: "We reach out", description: `A team member from ${name} contacts you to schedule your demo call.` },
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
      `${name} provides Axtion, a communications CRM. Submit your details below to request a demo call — a team member from ${name} will contact you to schedule it.`,
    submitLabel: "Request my demo call",
    successMessage: (name) =>
      `Thank you — we've received your demo request and a team member from ${name} will contact you to schedule your call. If you agreed to text messages, reply STOP at any time to opt out.`,
    termsHeading: "Demo call requests",
    termsBody: (name) =>
      `${name} provides Axtion, a communications CRM. Submitting our form is a request to schedule a demo call with ${name}; it is not a purchase and does not commit you to anything. A team member will contact you at the email address or phone number you provide to arrange the call.`,
    privacyUse:
      "We use your contact details to respond to your request and to contact you to schedule your demo call. If you separately agree to receive text messages, we use your mobile number to send you marketing and promotional SMS messages about our products and services. Submitting the form does not require you to agree to text messages.",
  },
};

const WELOVEHOUSES: LeadGenProfile = {
  kind: "lead-gen",
  cta: "Get My Cash Offer",
  badge: "Real Estate Investor",
  headline: (name) => `Sell your house fast to ${name}`,
  subtext: (name) =>
    `${name} is a nationwide real estate investment company that buys properties in any condition. Tell us a little about you and your property, and a team member will follow up with a cash offer.`,
  about: (name) =>
    `${name} is a nationwide real estate investment company that buys properties directly, with all-cash offers and flexible closing timelines.`,
  offering: "a cash offer",
  smsTopic: "real estate and property offers",
  disclaimer: "Offers are subject to a review of the property.",
  optinNote: " Offers are subject to a review of the property.",
  consentSuffix: " or of selling your property",
  termsNote:
    "is not a contract and does not obligate you to sell your property. Any offer is subject to a review of the property and will be provided to you separately.",
  faqs: (name) => [
    {
      q: `Who is ${name}?`,
      a: `${name} is a real estate investment company. We buy properties directly with our own funds, so there are no agents and no listing process, and we can close in as little as 30 days or on a timeline that works for you.`,
    },
    {
      q: "What types of properties do you buy?",
      a: "We buy properties in any condition, whatever your situation. Tell us about your property and a team member will follow up.",
    },
    {
      q: "Does submitting the form obligate me to sell?",
      a: "No. Submitting the form is a request to hear about a cash offer. Any offer is subject to a review of the property, and you decide whether to move forward.",
    },
  ],
  copy: {
    steps: (name) => [
      { title: "Tell us about your property", description: "Share your name and contact details through our short secure form." },
      { title: "We review your request", description: `A team member from ${name} reviews your request and reaches out to you.` },
      { title: "Receive a cash offer", description: "We follow up with an all-cash offer based on what you tell us. You decide whether to accept." },
    ],
    closing: (name) => ({
      heading: "Ready to sell your house?",
      text: `Request a cash offer from ${name} in under a minute.`,
    }),
    formTitle: (name) => `Request a cash offer from ${name}`,
    submitLabel: "Request my cash offer",
  },
};

const ELECTRIVERA: LeadGenProfile = {
  kind: "lead-gen",
  cta: "Join the Campaign",
  badge: "Political Campaign",
  headline: (name) => `Stay connected with ${name}`,
  subtext: (name) =>
    `${name} is the political campaign of Hector Rivera. Share your details to hear from the campaign about updates, events and voting information. Text messaging is optional.`,
  about: (name) => `${name} is the political campaign of Hector Rivera.`,
  offering: "campaign updates",
  smsTopic: "campaign updates, events and voting information",
  smsSubject: "political campaign messages",
  disclaimer: "",
  optinNote: "",
  consentSuffix: " or of any contribution",
  termsNote:
    "is not a contribution, a pledge, or a commitment, and does not obligate you to do anything.",
  faqs: (name) => [
    {
      q: `Who is ${name}?`,
      a: `${name} is the political campaign of Hector Rivera. We use this page to let supporters and voters sign up to hear from the campaign.`,
    },
    {
      q: "What will the campaign contact me about?",
      a: "Campaign updates, event invitations, volunteer opportunities and voting information. Text messaging is a separate, optional choice on the form.",
    },
    {
      q: "Does signing up commit me to anything?",
      a: "No. Signing up only lets the campaign contact you. It is not a contribution, a pledge or a commitment of any kind.",
    },
  ],
  copy: {
    steps: (name) => [
      { title: "Share your details", description: "Enter your name, email and mobile number through our short secure form." },
      { title: "Choose text messages", description: "Texts are optional. Check the separate consent box only if you want to receive political campaign messages by SMS." },
      { title: "Hear from the campaign", description: `${name} contacts you with updates, events and voting information. Reply STOP at any time to opt out.` },
    ],
    closing: (name) => ({
      heading: "Want to hear from the campaign?",
      text: `Sign up to receive updates from ${name} in under a minute.`,
    }),
    formTitle: (name) => `Get campaign updates from ${name}`,
    formIntro: (name) =>
      `${name} is the political campaign of Hector Rivera. Share your details below to hear from the campaign. Text messages are optional and require a separate consent.`,
    submitLabel: "Sign me up",
    successMessage: (name) =>
      `Thank you — you're signed up with ${name}. If you agreed to text messages, reply STOP at any time to opt out.`,
    termsHeading: "Campaign updates",
    termsBody: (name) =>
      `${name} is the political campaign of Hector Rivera. Submitting our form is a request to hear from the campaign; it is not a contribution, a pledge or a commitment of any kind. The campaign may contact you at the email address or phone number you provide.`,
    privacyUse:
      "We use your contact details to respond to your sign-up and to send you campaign updates, event invitations and voting information. If you separately agree to receive text messages, we use your mobile number to send you political campaign messages by SMS. Submitting the form does not require you to agree to text messages.",
  },
};

const PROFILES: Record<string, LeadGenProfile> = {
  nexgencapllc: NEXGEN,
  axtionllc: AXTION,
  welovehousesllc: WELOVEHOUSES,
  electriveraforpublicoffice: ELECTRIVERA,
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
