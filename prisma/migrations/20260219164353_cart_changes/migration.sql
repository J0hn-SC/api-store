/*
  Warnings:

  - You are about to drop the column `disabled` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "promoCodeId" TEXT;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "disabled";

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
