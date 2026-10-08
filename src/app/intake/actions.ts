"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { generateSubAccountToken } from "@/lib/auth";
import { generateUniqueSubdomain } from "@/lib/generateSubdomain";
import { subdomainUrl } from "@/lib/subdomain";
import { standardOptInOutHelp } from "@/lib/campaignTemplate";
import { getProvider } from "@/lib/providers";
import type { BrandInput } from "@/lib/providers/types";

// One comprehensive, client-facing form replaces the old external GHL intake
// form (https://m.lnxit.com/widget/form/fIEVgyRHQ3phxLMTQvpR) — that form was
// missing fields our pipeline actually requires (business contact info, a
// full authorized-rep record, business type) and left opt-in/opt-out/help
// copy and Terms/Privacy links to be typed by hand, which is exactly where
// Building Hope's submission went wrong. Terms/Privacy links and the opt-in/
// opt-out/help messages are auto-derived here instead of collected at all.
const schema = z.object({
  provider: z.enum(["TWILIO", "TEXTGRID"]),

  businessName: z.string().min(1, "Business name is required"),
  ein: z.string().min(9, "EIN looks too short"),
  businessType: z.string().min(1),
  vertical: z.string().min(1),
  website: z.string().optional(),
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(2),
  postalCode: z.string().min(3),
  country: z.string().min(2),
  areaCodesRequested: z.string().optional(),

  contactName: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Enter a valid business contact email"),
  contactPhone: z.string().min(7, "Enter a valid business contact phone"),

  repFirstName: z.string().min(1),
  repLastName: z.string().min(1),
  repEmail: z.string().email("Enter a valid authorized-representative email"),
  repPhone: z.string().min(7, "Enter a valid authorized-representative phone"),
  repBusinessTitle: z.string().min(1),
  repJobPosition: z.string().min(1),

  useCase: z.string().min(1),
  description: z.string().min(40, "Describe the campaign in at least 40 characters"),
  optInDetails: z.string().min(40, "Describe how consumers opt in (min 40 characters)"),
  sampleMessages: z.string().min(1),
  hasEmbeddedLinks: z.string().optional(),
  hasEmbeddedPhone: z.string().optional(),
});

export type IntakeState = { error?: string; dashboardUrl?: string };

export async function submitIntake(_prev: IntakeState, formData: FormData): Promise<IntakeState> {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const existing = await db.subAccount.findFirst({
    where: { businessName: { equals: d.businessName, mode: "insensitive" } },
  });
  if (existing) {
    const base = process.env.PUBLIC_APP_URL || "";
    return {
      error: `A sub-account for "${existing.businessName}" already exists — use its existing dashboard (${base}/d/${existing.token}) instead of submitting a second intake.`,
    };
  }

  const token = generateSubAccountToken();
  const subdomain = await generateUniqueSubdomain(d.businessName);

  const subAccount = await db.subAccount.create({
    data: {
      token,
      businessName: d.businessName,
      contactName: d.contactName,
      contactEmail: d.contactEmail,
      provider: d.provider,
      subdomain,
      statusEvents: {
        create: {
          entityType: "SUB_ACCOUNT",
          message: `Sub-account created via client intake form.${d.areaCodesRequested ? ` Area codes requested: ${d.areaCodesRequested}.` : ""}`,
          actor: "client",
        },
      },
    },
  });

  const brandInput: BrandInput = {
    legalBusinessName: d.businessName,
    ein: d.ein,
    businessType: d.businessType,
    vertical: d.vertical,
    website: d.website,
    street: d.street,
    city: d.city,
    state: d.state,
    postalCode: d.postalCode,
    country: d.country,
    contactEmail: d.contactEmail,
    contactPhone: d.contactPhone,
    authorizedRep: {
      firstName: d.repFirstName,
      lastName: d.repLastName,
      email: d.repEmail,
      phone: d.repPhone,
      businessTitle: d.repBusinessTitle,
      jobPosition: d.repJobPosition,
    },
  };

  try {
    const provider = getProvider(d.provider);
    const status = await provider.submitBrand(brandInput);
    await db.brand.create({
      data: {
        subAccountId: subAccount.id,
        provider: d.provider,
        providerBrandId: status.providerBrandId,
        legalBusinessName: d.businessName,
        ein: d.ein,
        businessType: d.businessType,
        vertical: d.vertical,
        website: d.website,
        street: d.street,
        city: d.city,
        state: d.state,
        postalCode: d.postalCode,
        country: d.country,
        contactEmail: d.contactEmail,
        contactPhone: d.contactPhone,
        repFirstName: d.repFirstName,
        repLastName: d.repLastName,
        repEmail: d.repEmail,
        repPhone: d.repPhone,
        repBusinessTitle: d.repBusinessTitle,
        repJobPosition: d.repJobPosition,
        stage: status.stage,
        submittedAt: new Date(),
        rawPayload: status.raw as object,
      },
    });
    await db.statusEvent.create({
      data: { subAccountId: subAccount.id, entityType: "BRAND", message: `Brand submitted to ${d.provider} via intake form — status: ${status.stage}.`, actor: "client" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Brand submission failed";
    await db.statusEvent.create({
      data: { subAccountId: subAccount.id, entityType: "BRAND", message: `Brand submission to ${d.provider} failed: ${message}`, actor: "client" },
    });
  }

  // The campaign can't actually be submitted until the brand clears review, so
  // this is held as a draft (stage: NOT_SUBMITTED, no providerCampaignId) —
  // all the client's answers are captured now rather than asked for twice;
  // submitDraftCampaign sends it once the brand is approved.
  const sampleMessages = d.sampleMessages
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);
  await db.campaign.create({
    data: {
      subAccountId: subAccount.id,
      provider: d.provider,
      useCase: d.useCase,
      description: d.description,
      sampleMessages,
      optInDetails: d.optInDetails,
      hasEmbeddedLinks: d.hasEmbeddedLinks === "on",
      hasEmbeddedPhone: d.hasEmbeddedPhone === "on",
      termsAndConditionsLink: subdomainUrl(subdomain, "/terms"),
      privacyPolicyLink: subdomainUrl(subdomain, "/privacy"),
      ...standardOptInOutHelp(d.businessName),
    },
  });
  await db.statusEvent.create({
    data: { subAccountId: subAccount.id, entityType: "CAMPAIGN", message: "Campaign details captured via intake form — held as a draft until the brand is approved.", actor: "client" },
  });

  const base = process.env.PUBLIC_APP_URL || "";
  return { dashboardUrl: `${base}/d/${token}` };
}
