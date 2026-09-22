-- AlterTable
ALTER TABLE "SubAccount" ADD COLUMN     "subdomain" TEXT;

-- CreateTable
CREATE TABLE "OptInSubmission" (
    "id" TEXT NOT NULL,
    "subAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "consentText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptInSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubAccount_subdomain_key" ON "SubAccount"("subdomain");

-- CreateIndex
CREATE INDEX "OptInSubmission_subAccountId_createdAt_idx" ON "OptInSubmission"("subAccountId", "createdAt");

-- AddForeignKey
ALTER TABLE "OptInSubmission" ADD CONSTRAINT "OptInSubmission_subAccountId_fkey" FOREIGN KEY ("subAccountId") REFERENCES "SubAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
