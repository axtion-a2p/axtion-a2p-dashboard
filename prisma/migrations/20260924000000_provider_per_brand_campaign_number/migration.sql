-- A sub-account is no longer locked to a single carrier: Brand and Campaign
-- (and PhoneNumber, which needs to know which inventory it came from even
-- before assignment) each carry their own provider, backfilled from the
-- owning sub-account's existing provider for all pre-existing rows.

ALTER TABLE "Brand" ADD COLUMN "provider" "Provider";
UPDATE "Brand" b SET "provider" = s."provider" FROM "SubAccount" s WHERE b."subAccountId" = s."id";
ALTER TABLE "Brand" ALTER COLUMN "provider" SET NOT NULL;
DROP INDEX IF EXISTS "Brand_subAccountId_key";
CREATE UNIQUE INDEX "Brand_subAccountId_provider_key" ON "Brand"("subAccountId", "provider");
CREATE INDEX "Brand_subAccountId_idx" ON "Brand"("subAccountId");

ALTER TABLE "Campaign" ADD COLUMN "provider" "Provider";
UPDATE "Campaign" c SET "provider" = s."provider" FROM "SubAccount" s WHERE c."subAccountId" = s."id";
ALTER TABLE "Campaign" ALTER COLUMN "provider" SET NOT NULL;

ALTER TABLE "PhoneNumber" ADD COLUMN "provider" "Provider";
UPDATE "PhoneNumber" p SET "provider" = s."provider" FROM "SubAccount" s WHERE p."subAccountId" = s."id";
ALTER TABLE "PhoneNumber" ALTER COLUMN "provider" SET NOT NULL;
