"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireSiteSubAccount } from "../data";
import { optInCategoriesForUseCases, optInDisclosureText, OPT_IN_CATEGORY_FIELD_NAME } from "@/lib/optInCategories";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().min(7, "Enter a valid phone number"),
});

export type OptInState = { error?: string; ok?: boolean };

export async function submitOptIn(subdomain: string, _prev: OptInState, formData: FormData): Promise<OptInState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Agreeing to the Privacy Policy/Terms is required to submit the form at
  // all; SMS opt-in is a separate, optional consent — a submission can exist
  // with zero categories accepted, matching "Consent is not a condition of
  // purchase" in the site's own Privacy Policy.
  if (formData.get("agreeToTerms") !== "on") {
    return { error: "You must agree to the Privacy Policy and Terms of Service to continue." };
  }

  const subAccount = await requireSiteSubAccount(subdomain);
  const categories = optInCategoriesForUseCases(subAccount.campaigns.map((c) => c.useCase));
  const acceptedCategories = categories.filter((c) => formData.get(OPT_IN_CATEGORY_FIELD_NAME(c)) === "on");

  const consentText = [
    `I have read and agree to ${subAccount.businessName}'s Privacy Policy and Terms of Service.`,
    ...acceptedCategories.map((c) => optInDisclosureText(c, subAccount.businessName)),
  ].join(" ");

  await db.optInSubmission.create({
    data: {
      subAccountId: subAccount.id,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      consentText,
      smsOptedIn: acceptedCategories.length > 0,
    },
  });

  await db.statusEvent.create({
    data: {
      subAccountId: subAccount.id,
      entityType: "SUB_ACCOUNT",
      message:
        acceptedCategories.length > 0
          ? `New sign-up via ${subdomain}/optin (${parsed.data.name}) — SMS opt-in: ${acceptedCategories.join(", ")}.`
          : `New sign-up via ${subdomain}/optin (${parsed.data.name}) — no SMS opt-in selected.`,
      actor: "system",
    },
  });

  return { ok: true };
}
