import { db } from "@/lib/db";
import type { ProviderAdapter } from "@/lib/providers/types";

/**
 * Runs the inbound-routing audit for one provider and logs anything found.
 * Call this right after assigning a number to a Messaging Service — that's
 * the exact moment this bug (service-level inbound routing disabled,
 * overriding an otherwise-correct per-number webhook) actually starts
 * mattering, so catching it here beats waiting for the next sync.
 */
export async function auditAndLogInboundRouting(
  provider: ProviderAdapter,
  subAccountId: string,
  actor: "admin" | "client" | "system"
) {
  try {
    const audit = await provider.auditInboundRouting();
    for (const result of audit) {
      if (result.wasHealthy) continue;
      const message = result.fixed
        ? `Inbound SMS routing was disabled on Messaging Service "${result.serviceName}" (${result.numbersAttached} number(s) attached) — auto-fixed.`
        : `Inbound SMS routing is disabled on Messaging Service "${result.serviceName}" (${result.numbersAttached} number(s) attached) and auto-fix failed: ${result.error}`;
      await db.statusEvent.create({
        data: { subAccountId, entityType: "SUB_ACCOUNT", message, actor },
      });
    }
  } catch (err) {
    await db.statusEvent.create({
      data: {
        subAccountId,
        entityType: "SUB_ACCOUNT",
        message: `Inbound routing audit failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        actor,
      },
    });
  }
}
