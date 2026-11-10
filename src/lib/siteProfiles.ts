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
};

const PROFILES: Record<string, LeadGenProfile> = {
  nexgencapllc: NEXGEN,
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
