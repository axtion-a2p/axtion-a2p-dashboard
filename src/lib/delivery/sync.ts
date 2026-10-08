// Pulls Messages/Calls from Twilio into the local DeliveryEvent table so the
// delivery report can filter/aggregate without hitting Twilio's API on every
// page load. Always re-pulls a window (not just "new since X"), because a
// message's status/price can still change after it's first fetched
// (queued -> sent -> delivered) — upserting by providerSid makes that safe.

import { db } from "@/lib/db";
import { resolveTwilioDeliveryConfig, TwilioDeliveryClient } from "./twilioDeliveryClient";
import { mapRawStatusToDeliveryStatus } from "./statusMapping";

const DEFAULT_RECURRING_SYNC_WINDOW_DAYS = 3;
const DEFAULT_BACKFILL_WINDOW_DAYS = 730; // ~2 years, bounds the one-time backfill

export type SyncResult = { messagesSeen: number; callsSeen: number };

export async function syncDeliveryEventsForSubAccount(
  subAccountId: string,
  options: { sinceDays?: number } = {}
): Promise<SyncResult> {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { id: subAccountId } });
  if (subAccount.provider !== "TWILIO") return { messagesSeen: 0, callsSeen: 0 };

  const sinceDays = options.sinceDays ?? DEFAULT_RECURRING_SYNC_WINDOW_DAYS;
  const since = subAccount.lastDeliverySyncAt
    ? new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)
    : new Date(Date.now() - DEFAULT_BACKFILL_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const config = resolveTwilioDeliveryConfig(subAccount.providerAccountSid, subAccount.providerAuthToken);
  const client = new TwilioDeliveryClient(config);

  const [messages, calls] = await Promise.all([client.listMessagesSince(since), client.listCallsSince(since)]);

  for (const m of messages) {
    const numMedia = Number(m.num_media ?? "0");
    await db.deliveryEvent.upsert({
      where: { providerSid: m.sid },
      create: {
        subAccountId,
        providerSid: m.sid,
        channel: numMedia > 0 ? "MMS" : "SMS",
        direction: m.direction,
        rawStatus: m.status,
        status: mapRawStatusToDeliveryStatus(m.status),
        errorCode: m.error_code ?? null,
        errorMessage: m.error_message ?? null,
        priceAmount: m.price ?? null,
        priceUnit: m.price_unit ?? null,
        occurredAt: new Date(m.date_sent ?? m.date_created),
      },
      update: {
        rawStatus: m.status,
        status: mapRawStatusToDeliveryStatus(m.status),
        errorCode: m.error_code ?? null,
        errorMessage: m.error_message ?? null,
        priceAmount: m.price ?? null,
        priceUnit: m.price_unit ?? null,
      },
    });
  }

  for (const c of calls) {
    await db.deliveryEvent.upsert({
      where: { providerSid: c.sid },
      create: {
        subAccountId,
        providerSid: c.sid,
        channel: "VOICE",
        direction: c.direction,
        rawStatus: c.status,
        status: mapRawStatusToDeliveryStatus(c.status),
        errorCode: null,
        errorMessage: null,
        priceAmount: c.price ?? null,
        priceUnit: c.price_unit ?? null,
        occurredAt: new Date(c.start_time ?? c.date_created),
      },
      update: {
        rawStatus: c.status,
        status: mapRawStatusToDeliveryStatus(c.status),
        priceAmount: c.price ?? null,
        priceUnit: c.price_unit ?? null,
      },
    });
  }

  await db.subAccount.update({ where: { id: subAccountId }, data: { lastDeliverySyncAt: new Date() } });

  return { messagesSeen: messages.length, callsSeen: calls.length };
}

export async function syncDeliveryEventsForAllTwilioSubAccounts(options: { sinceDays?: number } = {}) {
  const subAccounts = await db.subAccount.findMany({ where: { provider: "TWILIO" }, select: { id: true } });
  const results = await Promise.allSettled(
    subAccounts.map((s) => syncDeliveryEventsForSubAccount(s.id, options))
  );
  for (const r of results) {
    if (r.status === "rejected") console.error("[delivery sync] failed:", r.reason);
  }
  const failed = results.filter((r) => r.status === "rejected").length;
  return { synced: subAccounts.length, failed };
}
