-- Decouples SMS opt-in from Privacy/Terms agreement on the compliance-site
-- opt-in form: adds an email field (nullable at the DB level so this applies
-- cleanly to any pre-existing rows; required by the form/zod validation for
-- all new submissions), and a smsOptedIn flag since SMS consent is now its
-- own optional checkbox rather than required to submit the form at all.
ALTER TABLE "OptInSubmission" ADD COLUMN "email" TEXT;
ALTER TABLE "OptInSubmission" ADD COLUMN "smsOptedIn" BOOLEAN NOT NULL DEFAULT false;
