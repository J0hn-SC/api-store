/*
  Warnings:

  - You are about to drop the column `active` on the `PromoCode` table. All the data in the column will be lost.
  - You are about to drop the column `minimumPurchase` on the `PromoCode` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PromoCodeStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- AlterTable
ALTER TABLE "PromoCode" DROP COLUMN "active",
DROP COLUMN "minimumPurchase",
ADD COLUMN     "minimumPurchaseAmount" DECIMAL(10,2),
ADD COLUMN     "status" "PromoCodeStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "expirationDate" DROP NOT NULL;
