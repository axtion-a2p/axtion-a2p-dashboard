"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireSiteSubAccount } from "../data";
import { optInCategoriesForUseCases, optInDisclosureText, OPT_IN_CATEGORY_FIELD_NAME } from "@/lib/optInCategories";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(7, "Enter a valid phone number"),
});

export type OptInState = { error?: string; ok?: boolean };

export async function submitOptIn(subdomain: string, _prev: OptInState, formData: FormData): Promise<OptInState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const subAccount = await requireSiteSubAccount(subdomain);
  const categories = optInCategoriesForUseCases(subAccount.campaigns.map((c) => c.useCase));
  const acceptedCategories = categories.filter((c) => formData.get(OPT_IN_CATEGORY_FIELD_NAME(c)) === "on");

  if (acceptedCategories.length === 0) {
    return { error: "Select at least one type of message to continue." };
  }

  const consentText = acceptedCategories
    .map((c) => optInDisclosureText(c, subAccount.businessName))
    .join(" ");

  await db.optInSubmission.create({
    data: {
      subAccountId: subAccount.id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      consentText,
    },
  });

  await db.statusEvent.create({
    data: {
      subAccountId: subAccount.id,
      entityType: "SUB_ACCOUNT",
      message: `New SMS opt-in collected via ${subdomain}/optin (${parsed.data.name}) — ${acceptedCategories.join(", ")}.`,
      actor: "system",
    },
  });

  return { ok: true };
}
