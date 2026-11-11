import { db } from "@/lib/db";
import { generateSubAccountToken } from "@/lib/auth";
import { generateUniqueSubdomain } from "@/lib/generateSubdomain";
import { getProvider } from "@/lib/providers";
import { TextGridProvider } from "@/lib/providers/textgridProvider";
import { createTwilioSubaccount } from "@/lib/twilioAccount";

export type ProvisionInput = {
  externalRef: string; // payment / checkout id — the idempotency key
  businessName: string;
  contactName?: string;
  contactEmail?: string;
  provider: "TWILIO" | "TEXTGRID"; // the sub-account's primary provider
  ghlLocationId?: string;
  ghlLocationName?: string;
};

export type ProvisionResult =
  | {
      outcome: "complete" | "partial" | "in_progress";
      subAccountId: string;
      dashboardUrl: string;
      twilioAccountSid: string | null;
      textgridAccountSid: string | null;
      errors: string[];
      alreadyExisted: boolean;
    }
  | { outcome: "name_conflict"; existingDashboardUrl: string };

// A lease, not a lock: if a worker dies mid-provision the next retry can take over after this long.
const LEASE_MS = 2 * 60 * 1000;

function dashboardUrl(token: string) {
  return `${process.env.PUBLIC_APP_URL || ""}/d/${token}`;
}

async function log(subAccountId: string, message: string) {
  await db.statusEvent.create({ data: { subAccountId, entityType: "SUB_ACCOUNT", message, actor: "system" } });
}

/**
 * Idempotently creates a sub-account plus a dedicated Twilio subaccount and a
 * dedicated TextGrid sub-account for one successful payment. Safe to retry:
 * the same externalRef never creates a second row, and each provider account
 * is created at most once (its credentials are saved the moment it exists).
 */
export async function provisionClient(input: ProvisionInput): Promise<ProvisionResult> {
  let sa = await db.subAccount.findUnique({ where: { externalRef: input.externalRef } });
  const alreadyExisted = !!sa;

  if (!sa) {
    // Same business name under a different payment: don't silently make a
    // second row for one client — the caller must resolve it.
    const sameName = await db.subAccount.findFirst({
      where: { businessName: { equals: input.businessName, mode: "insensitive" } },
    });
    if (sameName) return { outcome: "name_conflict", existingDashboardUrl: dashboardUrl(sameName.token) };

    try {
      sa = await db.subAccount.create({
        data: {
          token: generateSubAccountToken(),
          businessName: input.businessName,
          contactName: input.contactName,
          contactEmail: input.contactEmail,
          provider: input.provider,
          subdomain: await generateUniqueSubdomain(input.businessName),
          ghlLocationId: input.ghlLocationId,
          ghlLocationName: input.ghlLocationName,
          externalRef: input.externalRef,
          statusEvents: {
            create: {
              entityType: "SUB_ACCOUNT",
              message: `Sub-account created by payment ${input.externalRef} via the provisioning API.`,
              actor: "system",
            },
          },
        },
      });
    } catch (err) {
      // A concurrent request with the same externalRef won the insert.
      const raced = await db.subAccount.findUnique({ where: { externalRef: input.externalRef } });
      if (!raced) throw err;
      sa = raced;
    }
  }

  const summary = (row: typeof sa, outcome: "complete" | "partial" | "in_progress", errors: string[]): ProvisionResult => ({
    outcome,
    subAccountId: row.id,
    dashboardUrl: dashboardUrl(row.token),
    twilioAccountSid: row.twilioAccountSid,
    textgridAccountSid: row.textgridAccountSid,
    errors,
    alreadyExisted,
  });

  if (sa.twilioAccountSid && sa.textgridAccountSid) {
    if (!sa.provisionedAt) await db.subAccount.update({ where: { id: sa.id }, data: { provisionedAt: new Date() } });
    return summary(sa, "complete", []);
  }

  // Take the lease. If another request holds it, report in_progress rather than double-creating.
  const now = new Date();
  const claimed = await db.subAccount.updateMany({
    where: {
      id: sa.id,
      OR: [{ provisionLockedAt: null }, { provisionLockedAt: { lt: new Date(now.getTime() - LEASE_MS) } }],
    },
    data: { provisionLockedAt: now },
  });
  if (claimed.count === 0) return summary(sa, "in_progress", []);

  const errors: string[] = [];
  try {
    // Re-read inside the lease so we see anything a previous attempt already saved.
    let current = await db.subAccount.findUniqueOrThrow({ where: { id: sa.id } });

    if (!current.twilioAccountSid) {
      try {
        const account = await createTwilioSubaccount(current.businessName);
        current = await db.subAccount.update({
          where: { id: current.id },
          data: { twilioAccountSid: account.sid, twilioAuthToken: account.auth_token },
        });
        await log(current.id, `Created dedicated Twilio subaccount ${account.sid} ("${account.friendly_name}").`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Twilio: ${message}`);
        await log(current.id, `Twilio subaccount creation FAILED: ${message}`);
      }
    }

    if (!current.textgridAccountSid) {
      try {
        const master = getProvider("TEXTGRID");
        if (!(master instanceof TextGridProvider)) throw new Error("TextGrid provider unavailable.");
        const account = await master.createSubAccount(current.businessName);
        current = await db.subAccount.update({
          where: { id: current.id },
          data: {
            textgridAccountSid: account.sid,
            textgridAuthToken: account.auth_token,
            textgridWebhookSecret: account.webhook_secret ?? null,
          },
        });
        await log(current.id, `Created dedicated TextGrid sub-account ${account.sid} ("${account.friendly_name}").`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`TextGrid: ${message}`);
        await log(current.id, `TextGrid sub-account creation FAILED: ${message}`);
      }
    }

    const complete = !!(current.twilioAccountSid && current.textgridAccountSid);
    const final = await db.subAccount.update({
      where: { id: current.id },
      data: { provisionLockedAt: null, ...(complete ? { provisionedAt: new Date() } : {}) },
    });
    return summary(final, complete ? "complete" : "partial", errors);
  } catch (err) {
    await db.subAccount.update({ where: { id: sa.id }, data: { provisionLockedAt: null } }).catch(() => {});
    throw err;
  }
}
