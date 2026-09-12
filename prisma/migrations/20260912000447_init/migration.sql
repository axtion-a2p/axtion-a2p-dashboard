-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('TWILIO', 'TEXTGRID');

-- CreateEnum
CREATE TYPE "BrandStage" AS ENUM ('NOT_SUBMITTED', 'PENDING_REVIEW', 'APPROVED', 'FAILED');

-- CreateEnum
CREATE TYPE "CampaignStage" AS ENUM ('NOT_SUBMITTED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CampaignHealth" AS ENUM ('UNKNOWN', 'HEALTHY', 'AT_RISK', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PhoneStatus" AS ENUM ('UNASSIGNED', 'PENDING_ASSIGNMENT', 'ASSIGNED', 'FAILED');

-- CreateTable
CREATE TABLE "SubAccount" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactName" TEXT,
    "provider" "Provider" NOT NULL,
    "providerAccountSid" TEXT,
    "ghlLocationId" TEXT,
    "ghlLocationName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "subAccountId" TEXT NOT NULL,
    "providerBrandId" TEXT,
    "legalBusinessName" TEXT NOT NULL,
    "ein" TEXT,
    "businessType" TEXT,
    "vertical" TEXT,
    "website" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "stage" "BrandStage" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "failureReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "subAccountId" TEXT NOT NULL,
    "providerCampaignId" TEXT,
    "messagingServiceSid" TEXT,
    "useCase" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sampleMessages" JSONB NOT NULL,
    "optInDetails" TEXT,
    "optInImageUrl" TEXT,
    "hasEmbeddedLinks" BOOLEAN NOT NULL DEFAULT false,
    "hasEmbeddedPhone" BOOLEAN NOT NULL DEFAULT false,
    "stage" "CampaignStage" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "health" "CampaignHealth" NOT NULL DEFAULT 'UNKNOWN',
    "throughputPerMinute" INTEGER,
    "failureReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneNumber" (
    "id" TEXT NOT NULL,
    "subAccountId" TEXT NOT NULL,
    "campaignId" TEXT,
    "e164" TEXT NOT NULL,
    "providerSid" TEXT,
    "status" "PhoneStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "purchasedAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhoneNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusEvent" (
    "id" TEXT NOT NULL,
    "subAccountId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "message" TEXT NOT NULL,
    "actor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubAccount_token_key" ON "SubAccount"("token");

-- CreateIndex
CREATE INDEX "SubAccount_provider_idx" ON "SubAccount"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_subAccountId_key" ON "Brand"("subAccountId");

-- CreateIndex
CREATE INDEX "Campaign_subAccountId_idx" ON "Campaign"("subAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneNumber_e164_key" ON "PhoneNumber"("e164");

-- CreateIndex
CREATE INDEX "PhoneNumber_subAccountId_idx" ON "PhoneNumber"("subAccountId");

-- CreateIndex
CREATE INDEX "PhoneNumber_campaignId_idx" ON "PhoneNumber"("campaignId");

-- CreateIndex
CREATE INDEX "StatusEvent_subAccountId_createdAt_idx" ON "StatusEvent"("subAccountId", "createdAt");

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_subAccountId_fkey" FOREIGN KEY ("subAccountId") REFERENCES "SubAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_subAccountId_fkey" FOREIGN KEY ("subAccountId") REFERENCES "SubAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneNumber" ADD CONSTRAINT "PhoneNumber_subAccountId_fkey" FOREIGN KEY ("subAccountId") REFERENCES "SubAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneNumber" ADD CONSTRAINT "PhoneNumber_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusEvent" ADD CONSTRAINT "StatusEvent_subAccountId_fkey" FOREIGN KEY ("subAccountId") REFERENCES "SubAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
