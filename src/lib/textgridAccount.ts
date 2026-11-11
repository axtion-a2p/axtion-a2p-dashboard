import { db } from "@/lib/db";
import { credentialsFor, getProvider } from "@/lib/providers";
import { TextGridProvider } from "@/lib/providers/textgridProvider";

/**
 * TextGrid brands and campaigns belong to whichever account authenticates the
 * call, so each client gets its own TextGrid sub-account instead of landing
 * on the master account. Creates one (named after the business) the first
 * time a TextGrid submission is made for a sub-account and stores its
 * credentials as the sub-account's provider override; later calls reuse it.
 */
export async function ensureTextGridAccount(subAccountId: string) {
  const sa = await db.subAccount.findUniqueOrThrow({ where: { id: subAccountId } });

  // Per-provider credentials (or a legacy pair that is actually a TextGrid
  // one) already on file — reuse them.
  if (credentialsFor(sa, "TEXTGRID").sid) return sa;

  const master = getProvider("TEXTGRID");
  if (!(master instanceof TextGridProvider)) throw new Error("TextGrid provider unavailable.");
  const account = await master.createSubAccount(sa.businessName);

  // Persist immediately: the auth token and webhook secret are only returned once.
  const updated = await db.subAccount.update({
    where: { id: sa.id },
    data: {
      textgridAccountSid: account.sid,
      textgridAuthToken: account.auth_token,
      textgridWebhookSecret: account.webhook_secret ?? null,
    },
  });
  await db.statusEvent.create({
    data: {
      subAccountId: sa.id,
      entityType: "SUB_ACCOUNT",
      message: `Created dedicated TextGrid sub-account ${account.sid} ("${account.friendly_name}") under the master account.`,
      actor: "system",
    },
  });
  return updated;
}
