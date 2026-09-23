-- Persist fields previously sent to the provider at submission time but not
-- stored locally, so an existing campaign can be re-edited later without
-- re-entering everything from scratch.
ALTER TABLE "Campaign" ADD COLUMN "termsAndConditionsLink" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "privacyPolicyLink" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "optinMessage" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "optoutMessage" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "helpMessage" TEXT;
