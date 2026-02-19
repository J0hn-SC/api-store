/*
  Warnings:

  - You are about to drop the column `deliveryPersonId` on the `Order` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_deliveryPersonId_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "deliveryPersonId",
ADD COLUMN     "deliveryUserId" TEXT,
ADD COLUMN     "shippingAddressSnapshot" TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryUserId_fkey" FOREIGN KEY ("deliveryUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
