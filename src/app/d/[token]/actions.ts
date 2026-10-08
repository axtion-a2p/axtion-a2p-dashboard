"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import type { BrandInput, CampaignInput } from "@/lib/providers/types";
import { healthForStatus } from "@/lib/campaignHealth";

const brandSchema = z.object({
  provider: z.enum(["TWILIO", "TEXTGRID"]),
  legalBusinessName: z.string().min(1),
  ein: z.string().min(9, "EIN looks too short"),
  businessType: z.string().min(1),
  vertical: z.string().min(1),
  website: z.string().optional(),
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(2),
  postalCode: z.string().min(3),
  country: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(7),
  repFirstName: z.string().min(1),
  repLastName: z.string().min(1),
  repEmail: z.string().email(),
  repPhone: z.string().min(7),
  repBusinessTitle: z.string().min(1),
  repJobPosition: z.string().min(1),
});

export type FormState = { error?: string; ok?: boolean };

async function requireSubAccount(token: string) {
  const subAccount = await db.subAccount.findUnique({ where: { token } });
  if (!subAccount) throw new Error("Sub-account not found");
  return subAccount;
}

export async function submitBrand(token: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = brandSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const subAccount = await requireSubAccount(token);
  const d = parsed.data;

  const input: BrandInput = {
    legalBusinessName: d.legalBusinessName,
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
    const provider = getProvider(d.provider, subAccount.providerAccountSid, subAccount.providerAuthToken);
    const status = await provider.submitBrand(input);

    await db.brand.upsert({
      where: { subAccountId_provider: { subAccountId: subAccount.id, provider: d.provider } },
      create: {
        subAccountId: subAccount.id,
        provider: d.provider,
        providerBrandId: status.providerBrandId,
        legalBusinessName: d.legalBusinessName,
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
      update: {
        providerBrandId: status.providerBrandId,
        legalBusinessName: d.legalBusinessName,
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
      data: {
        subAccountId: subAccount.id,
        entityType: "BRAND",
        message: `Brand submitted to ${d.provider} (account override on file: ${subAccount.providerAccountSid ?? "none — using platform default"}) — status: ${status.stage}.`,
        actor: "system",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Submission failed";
    await db.statusEvent.create({
      data: { subAccountId: subAccount.id, entityType: "BRAND", message: `Brand submission to ${d.provider} failed: ${message}`, actor: "system" },
    });
    revalidatePath(`/d/${token}`);
    return { error: message };
  }

  revalidatePath(`/d/${token}`);
  return { ok: true };
}

const campaignSchema = z.object({
  provider: z.enum(["TWILIO", "TEXTGRID"]),
  useCase: z.string().min(1),
  description: z.string().min(40, "Twilio requires at least 40 characters describing the use case"),
  optInDetails: z.string().min(40, "Describe how consumers opt in (min 40 characters)"),
  sampleMessages: z.string().min(1),
  hasEmbeddedLinks: z.string().optional(),
  hasEmbeddedPhone: z.string().optional(),
  termsAndConditionsLink: z.string().url("Enter a valid URL"),
  privacyPolicyLink: z.string().url("Enter a valid URL"),
  optinMessage: z.string().min(20, "Opt-in confirmation must be at least 20 characters"),
  optoutMessage: z.string().min(20, "Opt-out confirmation must be at least 20 characters"),
  helpMessage: z.string().min(20, "Help message must be at least 20 characters"),
});

export async function submitCampaign(token: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = campaignSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const subAccount = await requireSubAccount(token);
  const d = parsed.data;
  const brand = await db.brand.findUnique({
    where: { subAccountId_provider: { subAccountId: subAccount.id, provider: d.provider } },
  });
  if (!brand || brand.stage !== "APPROVED" || !brand.providerBrandId) {
    return { error: `The ${d.provider} brand must be approved before a campaign can be submitted through it.` };
  }

  const sampleMessages = d.sampleMessages
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);

  try {
    const provider = getProvider(d.provider, subAccount.providerAccountSid, subAccount.providerAuthToken);
    const service = await provider.createMessagingService(`${subAccount.businessName} - Messaging Service`);

    const input: CampaignInput = {
      messagingServiceSid: service.sid,
      useCase: d.useCase,
      description: d.description,
      sampleMessages,
      optInDetails: d.optInDetails,
      hasEmbeddedLinks: d.hasEmbeddedLinks === "on",
      hasEmbeddedPhone: d.hasEmbeddedPhone === "on",
      termsAndConditionsLink: d.termsAndConditionsLink,
      privacyPolicyLink: d.privacyPolicyLink,
      optinMessage: d.optinMessage,
      optoutMessage: d.optoutMessage,
      helpMessage: d.helpMessage,
    };

    const status = await provider.submitCampaign(brand.providerBrandId, input);

    // TextGrid has no separate "Messaging Service" resource — campaigns attach
    // directly to phone numbers, so we store the campaignId itself in this
    // column for TextGrid rows (see textgridProvider.ts's getCampaignStatus /
    // assignNumberToMessagingService notes) instead of the Twilio-only
    // Messaging Service sid.
    const messagingServiceSid = d.provider === "TEXTGRID" ? status.providerCampaignId : service.sid;

    await db.campaign.create({
      data: {
        subAccountId: subAccount.id,
        provider: d.provider,
        providerCampaignId: status.providerCampaignId,
        messagingServiceSid,
        useCase: d.useCase,
        description: d.description,
        sampleMessages,
        optInDetails: d.optInDetails,
        hasEmbeddedLinks: input.hasEmbeddedLinks,
        hasEmbeddedPhone: input.hasEmbeddedPhone,
        termsAndConditionsLink: d.termsAndConditionsLink,
        privacyPolicyLink: d.privacyPolicyLink,
        optinMessage: d.optinMessage,
        optoutMessage: d.optoutMessage,
        helpMessage: d.helpMessage,
        stage: status.stage,
        health: healthForStatus(status),
        submittedAt: new Date(),
        rawPayload: status.raw as object,
      },
    });

    await db.statusEvent.create({
      data: {
        subAccountId: subAccount.id,
        entityType: "CAMPAIGN",
        message: `Campaign submitted to ${d.provider} — status: ${status.stage}.`,
        actor: "system",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Submission failed";
    await db.statusEvent.create({
      data: { subAccountId: subAccount.id, entityType: "CAMPAIGN", message: `Campaign submission to ${d.provider} failed: ${message}`, actor: "system" },
    });
    revalidatePath(`/d/${token}`);
    return { error: message };
  }

  revalidatePath(`/d/${token}`);
  return { ok: true };
}

const campaignEditSchema = campaignSchema.omit({ provider: true, useCase: true });

/**
 * Amends an already-submitted campaign in place (same provider campaign SID,
 * same Messaging Service) instead of creating a new one. Token-scoped, no
 * login required — this is the client-facing equivalent of the admin-only
 * updateCampaignDetails action, so a rejection can be fixed and resubmitted
 * without proliferating a fresh campaign object on every attempt.
 */
export async function editCampaign(token: string, campaignId: string, formData: FormData) {
  const subAccount = await requireSubAccount(token);
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  if (campaign.subAccountId !== subAccount.id) throw new Error("That campaign doesn't belong to this sub-account.");
  if (!campaign.providerCampaignId || !campaign.messagingServiceSid) {
    throw new Error("Campaign has no provider campaign ID to amend.");
  }

  const parsed = campaignEditSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    await db.statusEvent.create({
      data: { subAccountId: subAccount.id, entityType: "CAMPAIGN", message: `Campaign edit failed: ${parsed.error.issues[0]?.message ?? "Invalid input"}`, actor: "client" },
    });
    revalidatePath(`/d/${token}?tab=campaigns`);
    return;
  }

  const d = parsed.data;
  const sampleMessages = d.sampleMessages
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);

  try {
    const provider = getProvider(campaign.provider, subAccount.providerAccountSid, subAccount.providerAuthToken);
    const input: CampaignInput = {
      messagingServiceSid: campaign.messagingServiceSid,
      useCase: campaign.useCase,
      description: d.description,
      sampleMessages,
      optInDetails: d.optInDetails,
      hasEmbeddedLinks: d.hasEmbeddedLinks === "on",
      hasEmbeddedPhone: d.hasEmbeddedPhone === "on",
      termsAndConditionsLink: d.termsAndConditionsLink,
      privacyPolicyLink: d.privacyPolicyLink,
      optinMessage: d.optinMessage,
      optoutMessage: d.optoutMessage,
      helpMessage: d.helpMessage,
    };

    const status = await provider.updateCampaign(campaign.providerCampaignId, input);

    await db.campaign.update({
      where: { id: campaignId },
      data: {
        description: d.description,
        sampleMessages,
        optInDetails: d.optInDetails,
        hasEmbeddedLinks: input.hasEmbeddedLinks,
        hasEmbeddedPhone: input.hasEmbeddedPhone,
        termsAndConditionsLink: d.termsAndConditionsLink,
        privacyPolicyLink: d.privacyPolicyLink,
        optinMessage: d.optinMessage,
        optoutMessage: d.optoutMessage,
        helpMessage: d.helpMessage,
        stage: status.stage,
        failureReason: status.failureReason,
        health: healthForStatus(status),
        rawPayload: status.raw as object,
      },
    });

    await db.statusEvent.create({
      data: { subAccountId: subAccount.id, entityType: "CAMPAIGN", message: `Campaign amended on ${campaign.provider} (same campaign ID, no new object) — status: ${status.stage}.`, actor: "client" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Edit failed";
    await db.statusEvent.create({
      data: { subAccountId: subAccount.id, entityType: "CAMPAIGN", message: `Campaign edit on ${campaign.provider} failed: ${message}`, actor: "client" },
    });
  }

  revalidatePath(`/d/${token}?tab=campaigns`);
}

/**
 * Sends a draft campaign (stage NOT_SUBMITTED, captured up front via the
 * intake form before the brand was approved) to the provider for the first
 * time — updates that same row in place rather than creating a new one.
 */
export async function submitDraftCampaign(token: string, campaignId: string) {
  const subAccount = await requireSubAccount(token);
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  if (campaign.subAccountId !== subAccount.id) throw new Error("That campaign doesn't belong to this sub-account.");
  if (campaign.providerCampaignId) throw new Error("This campaign has already been submitted.");

  const brand = await db.brand.findUnique({ where: { subAccountId_provider: { subAccountId: subAccount.id, provider: campaign.provider } } });
  if (!brand || brand.stage !== "APPROVED" || !brand.providerBrandId) {
    throw new Error(`The ${campaign.provider} brand must be approved before this draft campaign can be submitted.`);
  }

  try {
    const provider = getProvider(campaign.provider, subAccount.providerAccountSid, subAccount.providerAuthToken);
    const service = await provider.createMessagingService(`${subAccount.businessName} - Messaging Service`);

    const input: CampaignInput = {
      messagingServiceSid: service.sid,
      useCase: campaign.useCase,
      description: campaign.description,
      sampleMessages: campaign.sampleMessages as string[],
      optInDetails: campaign.optInDetails ?? undefined,
      hasEmbeddedLinks: campaign.hasEmbeddedLinks,
      hasEmbeddedPhone: campaign.hasEmbeddedPhone,
      termsAndConditionsLink: campaign.termsAndConditionsLink ?? undefined,
      privacyPolicyLink: campaign.privacyPolicyLink ?? undefined,
      optinMessage: campaign.optinMessage ?? undefined,
      optoutMessage: campaign.optoutMessage ?? undefined,
      helpMessage: campaign.helpMessage ?? undefined,
    };

    const status = await provider.submitCampaign(brand.providerBrandId, input);
    const messagingServiceSid = campaign.provider === "TEXTGRID" ? status.providerCampaignId : service.sid;

    await db.campaign.update({
      where: { id: campaignId },
      data: {
        providerCampaignId: status.providerCampaignId,
        messagingServiceSid,
        stage: status.stage,
        health: healthForStatus(status),
        submittedAt: new Date(),
        rawPayload: status.raw as object,
      },
    });
    await db.statusEvent.create({
      data: { subAccountId: subAccount.id, entityType: "CAMPAIGN", message: `Draft campaign submitted to ${campaign.provider} — status: ${status.stage}.`, actor: "client" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Submission failed";
    await db.statusEvent.create({
      data: { subAccountId: subAccount.id, entityType: "CAMPAIGN", message: `Draft campaign submission to ${campaign.provider} failed: ${message}`, actor: "client" },
    });
  }

  revalidatePath(`/d/${token}?tab=campaigns`);
}

/** Self-serve: buy a number found via NumbersPanel's search and optionally attach it straight to one of this sub-account's own approved campaigns. */
export async function purchaseAndAssignNumber(token: string, formData: FormData) {
  const providerName = String(formData.get("provider")) as "TWILIO" | "TEXTGRID";
  const e164 = String(formData.get("e164"));
  const campaignId = String(formData.get("campaignId") || "");

  const subAccount = await requireSubAccount(token);

  try {
    const provider = getProvider(providerName, subAccount.providerAccountSid, subAccount.providerAuthToken);
    const purchased = await provider.purchaseNumber(e164);

    const phoneNumber = await db.phoneNumber.create({
      data: {
        subAccountId: subAccount.id,
        provider: providerName,
        e164: purchased.e164,
        providerSid: purchased.providerSid,
        status: "UNASSIGNED",
        purchasedAt: new Date(),
      },
    });
    await db.statusEvent.create({
      data: {
        subAccountId: subAccount.id,
        entityType: "PHONE_NUMBER",
        message: `Purchased ${purchased.e164} (${providerName}).`,
        actor: "client",
      },
    });

    if (campaignId) {
      const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } });
      if (campaign.subAccountId !== subAccount.id) throw new Error("That campaign doesn't belong to this sub-account.");
      if (campaign.provider !== providerName) throw new Error(`Campaign is on ${campaign.provider}, number was bought on ${providerName}.`);
      if (!campaign.messagingServiceSid) throw new Error("Campaign has no messaging service.");

      await provider.assignNumberToMessagingService(campaign.messagingServiceSid, purchased.providerSid);
      await db.phoneNumber.update({
        where: { id: phoneNumber.id },
        data: { campaignId, status: "ASSIGNED", assignedAt: new Date() },
      });
      await db.statusEvent.create({
        data: {
          subAccountId: subAccount.id,
          entityType: "PHONE_NUMBER",
          message: `${purchased.e164} assigned to campaign "${campaign.useCase}".`,
          actor: "client",
        },
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Purchase failed";
    await db.statusEvent.create({
      data: { subAccountId: subAccount.id, entityType: "PHONE_NUMBER", message: `Purchase failed: ${message}`, actor: "client" },
    });
  }

  revalidatePath(`/d/${token}?tab=numbers`);
}
