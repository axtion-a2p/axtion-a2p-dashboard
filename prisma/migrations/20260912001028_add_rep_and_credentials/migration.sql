-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "repBusinessTitle" TEXT,
ADD COLUMN     "repEmail" TEXT,
ADD COLUMN     "repFirstName" TEXT,
ADD COLUMN     "repJobPosition" TEXT,
ADD COLUMN     "repLastName" TEXT,
ADD COLUMN     "repPhone" TEXT;

-- AlterTable
ALTER TABLE "SubAccount" ADD COLUMN     "providerAuthToken" TEXT;
