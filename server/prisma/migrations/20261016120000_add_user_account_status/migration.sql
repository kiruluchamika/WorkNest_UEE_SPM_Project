-- CreateEnum
CREATE TYPE "UserStatusAction" AS ENUM ('DISABLED', 'ENABLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ACCOUNT_DISABLED';
ALTER TYPE "NotificationType" ADD VALUE 'ACCOUNT_ENABLED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "disabledAt" TIMESTAMPTZ(3),
ADD COLUMN     "disabledReason" TEXT,
ADD COLUMN     "isDisabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserStatusEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" "UserStatusAction" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserStatusEvent_userId_createdAt_idx" ON "UserStatusEvent"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserStatusEvent" ADD CONSTRAINT "UserStatusEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStatusEvent" ADD CONSTRAINT "UserStatusEvent_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

