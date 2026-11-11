-- Per-provider dedicated accounts (a client can now have both a Twilio and a
-- TextGrid sub-account) plus the idempotency/lease columns used by the
-- payment-driven provisioning endpoint. All nullable, so this applies cleanly
-- to existing rows. Legacy providerAccountSid/providerAuthToken are left in
-- place and still honoured (matched to a provider by SID prefix) — no data is
-- moved here.
ALTER TABLE "SubAccount" ADD COLUMN "twilioAccountSid" TEXT;
ALTER TABLE "SubAccount" ADD COLUMN "twilioAuthToken" TEXT;
ALTER TABLE "SubAccount" ADD COLUMN "textgridAccountSid" TEXT;
ALTER TABLE "SubAccount" ADD COLUMN "textgridAuthToken" TEXT;
ALTER TABLE "SubAccount" ADD COLUMN "textgridWebhookSecret" TEXT;
ALTER TABLE "SubAccount" ADD COLUMN "externalRef" TEXT;
ALTER TABLE "SubAccount" ADD COLUMN "provisionedAt" TIMESTAMP(3);
ALTER TABLE "SubAccount" ADD COLUMN "provisionLockedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "SubAccount_externalRef_key" ON "SubAccount"("externalRef");
