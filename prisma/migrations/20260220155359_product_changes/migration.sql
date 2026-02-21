/*
  Warnings:

  - Added the required column `stripePriceId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stripeProductId` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "stripePriceId" TEXT NOT NULL,
ADD COLUMN     "stripeProductId" TEXT NOT NULL;
