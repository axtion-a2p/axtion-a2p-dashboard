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
  cta: "Get Offers & Updates",
  badge: "REI Operating Tools",
  headline: (name) => `Offers and product updates from ${name}`,
  subtext: (name) =>
    `${name} builds AI operating tools for real estate investors. Tell us a little about you, and we'll follow up with offers and product updates that may be useful to you.`,
  about: (name) => `${name} provides AI-powered operating tools for real estate investors.`,
  offering: "offers and product updates",
  smsTopic: "our products and services",
  disclaimer: "",
  optinNote: "",
  consentSuffix: "",
  termsNote: "is not a purchase and does not commit you to anything. Any offer will be provided to you separately.",
  faqs: (name) => [
    {
      q: `What is ${name}?`,
      a: `${name} provides AI-powered operating tools for real estate investors. This page lets you ask to hear about our offers and product updates.`,
    },
    {
      q: "Does submitting the form commit me to anything?",
      a: "No. Submitting the form is a request to hear about our offers and product updates. You decide whether to move forward.",
    },
  ],
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
