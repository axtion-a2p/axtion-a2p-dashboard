"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireSiteSubAccount } from "../data";
import { consentText } from "./consent";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(7, "Enter a valid phone number"),
  consent: z.literal("on", { message: "You must agree to receive text messages to continue." }),
});

export type OptInState = { error?: string; ok?: boolean };

export async function submitOptIn(subdomain: string, _prev: OptInState, formData: FormData): Promise<OptInState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    consent: formData.get("consent"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const subAccount = await requireSiteSubAccount(subdomain);

  await db.optInSubmission.create({
    data: {
      subAccountId: subAccount.id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      consentText: consentText(subAccount.businessName),
    },
  });

  await db.statusEvent.create({
    data: {
      subAccountId: subAccount.id,
      entityType: "SUB_ACCOUNT",
      message: `New SMS opt-in collected via ${subdomain}.lnxnow.com/optin (${parsed.data.name}).`,
      actor: "system",
    },
  });

  return { ok: true };
}
