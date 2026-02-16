-- CreateEnum
CREATE TYPE "EntityStatus" AS ENUM ('ACTIVE', 'DISABLED', 'PENDING', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE';
