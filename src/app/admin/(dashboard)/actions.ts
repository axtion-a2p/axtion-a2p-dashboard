"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { destroyAdminSession } from "@/lib/auth";
import { getProvider } from "@/lib/providers";
import { generateUniqueSubdomain } from "@/lib/generateSubdomain";
import { subdomainUrl } from "@/lib/subdomain";

export async function logout() {
  await destroyAdminSession();
  redirect("/admin/login");
}

/** Re-fetch brand + campaign status from the provider and update our local record. */
export async function syncSubAccount(subAccountId: string) {
  const subAccount = await db.subAccount.findUniqueOrThrow({
    where: { id: subAccountId },
    include: { brand: true, campaigns: true },
  });

  let provider;
  try {
    provider = getProvider(subAccount.provider, subAccount.providerAccountSid, subAccount.providerAuthToken);
  } catch (err) {
    await logEvent(subAccountId, "SUB_ACCOUNT", `Sync failed: ${errMessage(err)}`);
    revalidatePath(`/admin/${subAccountId}`);
    return;
  }

  if (subAccount.brand?.providerBrandId) {
    try {
      const status = await provider.getBrandStatus(subAccount.brand.providerBrandId);
      await db.brand.update({
        where: { id: subAccount.brand.id },
        data: {
          stage: status.stage,
          failureReason: status.failureReason,
          approvedAt: status.stage === "APPROVED" ? new Date() : subAccount.brand.approvedAt,
          rawPayload: status.raw as object,
        },
      });
    } catch (err) {
      await logEvent(subAccountId, "BRAND", `Sync failed: ${errMessage(err)}`);
    }
  }

  for (const campaign of subAccount.campaigns) {
    if (!campaign.providerCampaignId || !campaign.messagingServiceSid) continue;
    try {
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

/** Pull the provider's current phone number list into our local table (unassigned numbers). */
export async function syncPhoneNumbers(subAccountId: string) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { id: subAccountId } });

  try {
    const provider = getProvider(subAccount.provider, subAccount.providerAccountSid, subAccount.providerAuthToken);
    const numbers = await provider.listPhoneNumbers();
    for (const n of numbers) {
      await db.phoneNumber.upsert({
        where: { e164: n.e164 },
        create: { subAccountId, e164: n.e164, providerSid: n.providerSid, status: "UNASSIGNED", purchasedAt: new Date() },
        update: { providerSid: n.providerSid },
      });
    }
  } catch (err) {
    await logEvent(subAccountId, "SUB_ACCOUNT", `Phone number sync failed: ${errMessage(err)}`);
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
    if (!campaign.messagingServiceSid) throw new Error("Campaign has no messaging service");
    if (!phoneNumber.providerSid) throw new Error("Phone number has no provider SID");

    const provider = getProvider(subAccount.provider, subAccount.providerAccountSid, subAccount.providerAuthToken);
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
