"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, getCurrentAdminUser, getAccessibleSubAccountIds } from "@/lib/auth";
import { syncDeliveryEventsForSubAccount, syncDeliveryEventsForAllTwilioSubAccounts } from "@/lib/delivery/sync";

/** On-demand freshness for the delivery report — the cron only re-pulls a rolling window once a day. */
export async function syncNow(subAccountId?: string) {
  await requireAdmin();
  const user = await getCurrentAdminUser();
  if (!user) throw new Error("Not authenticated");

  if (subAccountId) {
    const accessible = await getAccessibleSubAccountIds(user);
    if (!accessible.includes(subAccountId)) throw new Error("Not authorized for this sub-account");
    await syncDeliveryEventsForSubAccount(subAccountId, { sinceDays: 1 });
  } else {
    await syncDeliveryEventsForAllTwilioSubAccounts({ sinceDays: 1 });
  }

  revalidatePath("/admin/delivery-report");
}
