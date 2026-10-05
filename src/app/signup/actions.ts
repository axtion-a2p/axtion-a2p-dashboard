"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { generateSubAccountToken } from "@/lib/auth";
import { generateUniqueSubdomain } from "@/lib/generateSubdomain";

const schema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Enter a valid email"),
  provider: z.enum(["TWILIO", "TEXTGRID"]),
  ghlLocationId: z.string().optional(),
  ghlLocationName: z.string().optional(),
});

export type SignupState = {
  error?: string;
  dashboardUrl?: string;
};

export async function createSubAccount(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = schema.safeParse({
    businessName: formData.get("businessName"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    provider: formData.get("provider"),
    ghlLocationId: formData.get("ghlLocationId") || undefined,
    ghlLocationName: formData.get("ghlLocationName") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // A sub-account can hold a brand under either provider (or both) — there's no
  // reason to ever need two rows for the same business anymore. Two rows for one
  // client is exactly what caused a real incident: a provider-account override
  // got saved on the "wrong" (older, orphaned) row while all actual submissions
  // ran through the other, and the mismatch went undetected for days.
  const existing = await db.subAccount.findFirst({
    where: { businessName: { equals: parsed.data.businessName, mode: "insensitive" } },
  });
  if (existing) {
    const base = process.env.PUBLIC_APP_URL || "";
    return {
      error: `A sub-account for "${existing.businessName}" already exists — use its existing dashboard (${base}/d/${existing.token}) instead of creating a second one.`,
    };
  }

  const token = generateSubAccountToken();
  const subdomain = await generateUniqueSubdomain(parsed.data.businessName);

  await db.subAccount.create({
    data: {
      token,
      businessName: parsed.data.businessName,
      contactName: parsed.data.contactName,
      contactEmail: parsed.data.contactEmail,
      provider: parsed.data.provider,
      subdomain,
      ghlLocationId: parsed.data.ghlLocationId,
      ghlLocationName: parsed.data.ghlLocationName,
      statusEvents: {
        create: { entityType: "SUB_ACCOUNT", message: "Sub-account created via sign-up form.", actor: "system" },
      },
    },
  });

  const base = process.env.PUBLIC_APP_URL || "";
  return { dashboardUrl: `${base}/d/${token}` };
}
