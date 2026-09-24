"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { destroyAdminSession } from "@/lib/auth";
import { getProvider } from "@/lib/providers";
import type { CampaignInput } from "@/lib/providers/types";
import { generateUniqueSubdomain } from "@/lib/generateSubdomain";
import { subdomainUrl } from "@/lib/subdomain";

export async function logout() {
  await destroyAdminSession();
  redirect("/admin/login");
}

/** Re-fetch brand + campaign status from the provider(s) actually used and update our local records. */
export async function syncSubAccount(subAccountId: string) {
  const subAccount = await db.subAccount.findUniqueOrThrow({
    where: { id: subAccountId },
    include: { brands: true, campaigns: true },
  });

  function providerFor(name: "TWILIO" | "TEXTGRID") {
    return getProvider(name, subAccount.providerAccountSid, subAccount.providerAuthToken);
  }

  for (const brand of subAccount.brands) {
    if (!brand.providerBrandId) continue;
    try {
      const provider = providerFor(brand.provider);
      const status = await provider.getBrandStatus(brand.providerBrandId);
      await db.brand.update({
        where: { id: brand.id },
        data: {
          stage: status.stage,
          failureReason: status.failureReason,
          approvedAt: status.stage === "APPROVED" ? new Date() : brand.approvedAt,
          rawPayload: status.raw as object,
        },
      });
    } catch (err) {
      await logEvent(subAccountId, "BRAND", `Sync failed (${brand.provider}): ${errMessage(err)}`, brand.id);
    }
  }

  for (const campaign of subAccount.campaigns) {
    if (!campaign.providerCampaignId || !campaign.messagingServiceSid) continue;
    try {
      const provider = providerFor(campaign.provider);
      const status = await provider.getCampaignStatus(campaign.messagingServiceSid, campaign.providerCampaignId);
      await db.campaign.update({
        where: { id: campaign.id },
        data: {
          stage: status.stage,
          failureReason: status.failureReason,
          health: status.stage === "APPROVED" ? "HEALTHY" : status.stage === "REJECTED" || status.stage === "SUSPENDED" ? "BLOCKED" : "AT_RISK",
          approvedAt: status.stage === "APPROVED" ? new Date() : campaign.approvedAt,
          rawPayload: status.raw as object,
        },
      });
    } catch (err) {
      await logEvent(subAccountId, "CAMPAIGN", `Sync failed: ${errMessage(err)}`, campaign.id);
    }
  }

  revalidatePath(`/admin/${subAccountId}`);
  revalidatePath("/admin");
}

/** Pull a provider's current phone number list into our local table (unassigned numbers). */
export async function syncPhoneNumbers(subAccountId: string, formData: FormData) {
  const providerName = String(formData.get("provider")) as "TWILIO" | "TEXTGRID";
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { id: subAccountId } });

  try {
    const provider = getProvider(providerName, subAccount.providerAccountSid, subAccount.providerAuthToken);
    const numbers = await provider.listPhoneNumbers();
    for (const n of numbers) {
      await db.phoneNumber.upsert({
        where: { e164: n.e164 },
        create: { subAccountId, provider: providerName, e164: n.e164, providerSid: n.providerSid, status: "UNASSIGNED", purchasedAt: new Date() },
        update: { providerSid: n.providerSid },
      });
    }
  } catch (err) {
    await logEvent(subAccountId, "SUB_ACCOUNT", `Phone number sync failed (${providerName}): ${errMessage(err)}`);
  }

  revalidatePath(`/admin/${subAccountId}`);
}

export async function assignNumberToCampaign(subAccountId: string, formData: FormData) {
  const phoneNumberId = String(formData.get("phoneNumberId"));
  const campaignId = String(formData.get("campaignId"));

  const [subAccount, phoneNumber, campaign] = await Promise.all([
    db.subAccount.findUniqueOrThrow({ where: { id: subAccountId } }),
    db.phoneNumber.findUniqueOrThrow({ where: { id: phoneNumberId } }),
    db.campaign.findUniqueOrThrow({ where: { id: campaignId } }),
  ]);

  try {
    if (phoneNumber.provider !== campaign.provider) {
      throw new Error(`Number is on ${phoneNumber.provider}, campaign is on ${campaign.provider}`);
    }
    if (!campaign.messagingServiceSid) throw new Error("Campaign has no messaging service");
    if (!phoneNumber.providerSid) throw new Error("Phone number has no provider SID");

    const provider = getProvider(campaign.provider, subAccount.providerAccountSid, subAccount.providerAuthToken);
    await provider.assignNumberToMessagingService(campaign.messagingServiceSid, phoneNumber.providerSid);
    await db.phoneNumber.update({
      where: { id: phoneNumberId },
      data: { campaignId, status: "ASSIGNED", assignedAt: new Date() },
    });
    await logEvent(subAccountId, "PHONE_NUMBER", `${phoneNumber.e164} assigned to campaign "${campaign.useCase}".`, phoneNumberId);
  } catch (err) {
    await db.phoneNumber.update({ where: { id: phoneNumberId }, data: { status: "FAILED" } });
    await logEvent(subAccountId, "PHONE_NUMBER", `Failed to assign ${phoneNumber.e164}: ${errMessage(err)}`, phoneNumberId);
  }

  revalidatePath(`/admin/${subAccountId}`);
}

/** Buys a specific number found via searchAvailableNumbers, and optionally assigns it straight to a campaign. */
export async function purchaseAndAssignNumber(subAccountId: string, formData: FormData) {
  const providerName = String(formData.get("provider")) as "TWILIO" | "TEXTGRID";
  const e164 = String(formData.get("e164"));
  const campaignId = String(formData.get("campaignId") || "");

  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { id: subAccountId } });

  try {
    const provider = getProvider(providerName, subAccount.providerAccountSid, subAccount.providerAuthToken);
    const purchased = await provider.purchaseNumber(e164);

    const phoneNumber = await db.phoneNumber.create({
      data: {
        subAccountId,
        provider: providerName,
        e164: purchased.e164,
        providerSid: purchased.providerSid,
        status: "UNASSIGNED",
        purchasedAt: new Date(),
      },
    });
    await logEvent(subAccountId, "PHONE_NUMBER", `Purchased ${purchased.e164} (${providerName}).`, phoneNumber.id);

    if (campaignId) {
      const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } });
      if (campaign.provider !== providerName) throw new Error(`Campaign is on ${campaign.provider}, number was bought on ${providerName}`);
      if (!campaign.messagingServiceSid) throw new Error("Campaign has no messaging service");

      await provider.assignNumberToMessagingService(campaign.messagingServiceSid, purchased.providerSid);
      await db.phoneNumber.update({
        where: { id: phoneNumber.id },
        data: { campaignId, status: "ASSIGNED", assignedAt: new Date() },
      });
      await logEvent(subAccountId, "PHONE_NUMBER", `${purchased.e164} assigned to campaign "${campaign.useCase}".`, phoneNumber.id);
    }
  } catch (err) {
    await logEvent(subAccountId, "PHONE_NUMBER", `Purchase failed: ${errMessage(err)}`);
  }

  revalidatePath(`/admin/${subAccountId}`);
}

const campaignEditSchema = z.object({
  useCase: z.string().min(1),
  description: z.string().min(40, "Description must be at least 40 characters"),
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

/** Edits an already-submitted campaign in place (e.g. filling in previously-missing sample messages) instead of creating a new one. */
export async function updateCampaignDetails(campaignId: string, formData: FormData) {
  const campaign = await db.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: { subAccount: true },
  });
  const subAccount = campaign.subAccount;

  const parsed = campaignEditSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    await logEvent(subAccount.id, "CAMPAIGN", `Campaign update failed: ${parsed.error.issues[0]?.message ?? "Invalid input"}`, campaignId);
    revalidatePath(`/admin/${subAccount.id}`);
    return;
  }

  if (!campaign.providerCampaignId) {
    await logEvent(subAccount.id, "CAMPAIGN", "Campaign update failed: no provider campaign ID on file.", campaignId);
    revalidatePath(`/admin/${subAccount.id}`);
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
      messagingServiceSid: campaign.messagingServiceSid ?? "",
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

    const status = await provider.updateCampaign(campaign.providerCampaignId, input);

    await db.campaign.update({
      where: { id: campaignId },
      data: {
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
        failureReason: status.failureReason,
        health: status.stage === "APPROVED" ? "HEALTHY" : status.stage === "REJECTED" || status.stage === "SUSPENDED" ? "BLOCKED" : "AT_RISK",
        rawPayload: status.raw as object,
      },
    });

    await logEvent(subAccount.id, "CAMPAIGN", `Campaign updated on ${campaign.provider} — status: ${status.stage}.`, campaignId);
  } catch (err) {
    await logEvent(subAccount.id, "CAMPAIGN", `Campaign update failed: ${errMessage(err)}`, campaignId);
  }

  revalidatePath(`/admin/${subAccount.id}`);
}

/** Backfills a compliance-site subdomain for sub-accounts created before this feature existed. */
export async function assignSubdomain(subAccountId: string) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { id: subAccountId } });
  if (subAccount.subdomain) return;

  const subdomain = await generateUniqueSubdomain(subAccount.businessName);
  await db.subAccount.update({ where: { id: subAccountId }, data: { subdomain } });
  await logEvent(subAccountId, "SUB_ACCOUNT", `Compliance site assigned: ${subdomainUrl(subdomain)}`);

  revalidatePath(`/admin/${subAccountId}`);
  revalidatePath("/admin");
}

function errMessage(err: unknown) {
  return err instanceof Error ? err.message : "Unknown error";
}

async function logEvent(subAccountId: string, entityType: string, message: string, entityId?: string) {
  await db.statusEvent.create({ data: { subAccountId, entityType, message, entityId, actor: "admin" } });
}
