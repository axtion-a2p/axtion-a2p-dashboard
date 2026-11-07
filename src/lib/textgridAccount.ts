import { db } from "@/lib/db";
import { getProvider } from "@/lib/providers";
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

  if (sa.providerAccountSid) {
    // One override pair is shared by both providers today; sending a Twilio
    // SID to TextGrid would just fail with a confusing auth error.
    if (sa.providerAccountSid.startsWith("AC")) {
      throw new Error(
        "This sub-account's dedicated credentials are a Twilio account. TextGrid needs its own account, which requires per-provider credentials on the sub-account."
      );
    }
    return sa;
  }

  const master = getProvider("TEXTGRID");
  if (!(master instanceof TextGridProvider)) throw new Error("TextGrid provider unavailable.");
  const account = await master.createSubAccount(sa.businessName);

  const updated = await db.subAccount.update({
    where: { id: sa.id },
    data: { providerAccountSid: account.sid, providerAuthToken: account.auth_token },
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
