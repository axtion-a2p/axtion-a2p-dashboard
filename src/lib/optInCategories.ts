// One opt-in consent checkbox per message type a client actually sends, mirroring
// the pattern TCR vetting partners expect (see e.g. Sendillo's intake form): a
// single generic "text alerts" checkbox doesn't disclose which kind of message the
// end user is consenting to. Categories are derived from the use cases of the
// sub-account's submitted campaigns; a sub-account with no campaigns yet falls back
// to a single generic "account" checkbox so pre-submission sites still work.

export type OptInCategory = "OTP" | "ACCOUNT" | "MARKETING";

export const OPT_IN_CATEGORY_ORDER: OptInCategory[] = ["OTP", "ACCOUNT", "MARKETING"];

function categoriesForUseCase(useCase: string): OptInCategory[] {
  switch (useCase) {
    case "TWO_FACTOR_AUTHENTICATION":
      return ["OTP"];
    case "MARKETING":
      return ["MARKETING"];
    case "MIXED":
      return ["ACCOUNT", "MARKETING"];
    default:
      // CUSTOMER_CARE, ACCOUNT_NOTIFICATION, APPOINTMENT_REMINDER, DELIVERY_NOTIFICATION
      return ["ACCOUNT"];
  }
}

/** Which opt-in consent checkboxes to show, based on the use cases of a sub-account's submitted campaigns. */
export function optInCategoriesForUseCases(useCases: string[]): OptInCategory[] {
  if (useCases.length === 0) return ["ACCOUNT"];
  const set = new Set<OptInCategory>();
  for (const useCase of useCases) {
    for (const category of categoriesForUseCase(useCase)) set.add(category);
  }
  return OPT_IN_CATEGORY_ORDER.filter((c) => set.has(c));
}

/** The "I agree to..." consent sentence for a category, up to "...HELP for help." — callers append a Privacy/Terms reference. */
export function optInStatement(category: OptInCategory, businessName: string): string {
  const subject =
    category === "OTP"
      ? "one-time passcodes (OTP) and account verification messages"
      : category === "MARKETING"
        ? "marketing and promotional messages"
        : "account notifications and service-related messages";
  return `I agree to receive ${subject} via SMS from ${businessName}. Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help.`;
}

/** Full plain-text disclosure (statement + Privacy/Terms reference) for snapshotting into a consent record. */
export function optInDisclosureText(category: OptInCategory, businessName: string): string {
  return `${optInStatement(category, businessName)} See our Privacy Policy and Terms of Service.`;
}

export const OPT_IN_CATEGORY_FIELD_NAME = (category: OptInCategory) => `consent_${category.toLowerCase()}`;
