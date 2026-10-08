
-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('SMS', 'MMS', 'VOICE');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('DELIVERED', 'UNDELIVERED', 'FAILED', 'UNKNOWN');

-- AlterTable
ALTER TABLE "SubAccount" ADD COLUMN     "lastDeliverySyncAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'RESTRICTED',
    "canViewSpend" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubAccountAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubAccountAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryEvent" (
    "id" TEXT NOT NULL,
    "subAccountId" TEXT NOT NULL,
    "providerSid" TEXT NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "direction" TEXT NOT NULL,
    "rawStatus" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "errorCode" INTEGER,
    "errorMessage" TEXT,
    "priceAmount" DECIMAL(10,5),
    "priceUnit" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE INDEX "SubAccountAccess_subAccountId_idx" ON "SubAccountAccess"("subAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "SubAccountAccess_userId_subAccountId_key" ON "SubAccountAccess"("userId", "subAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryEvent_providerSid_key" ON "DeliveryEvent"("providerSid");

-- CreateIndex
CREATE INDEX "DeliveryEvent_subAccountId_occurredAt_idx" ON "DeliveryEvent"("subAccountId", "occurredAt");

-- CreateIndex
CREATE INDEX "DeliveryEvent_occurredAt_idx" ON "DeliveryEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "DeliveryEvent_status_idx" ON "DeliveryEvent"("status");

-- AddForeignKey
ALTER TABLE "SubAccountAccess" ADD CONSTRAINT "SubAccountAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubAccountAccess" ADD CONSTRAINT "SubAccountAccess_subAccountId_fkey" FOREIGN KEY ("subAccountId") REFERENCES "SubAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryEvent" ADD CONSTRAINT "DeliveryEvent_subAccountId_fkey" FOREIGN KEY ("subAccountId") REFERENCES "SubAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

