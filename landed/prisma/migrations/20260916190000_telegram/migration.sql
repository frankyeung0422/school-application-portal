-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "telegramChatId" TEXT;
ALTER TABLE "Customer" ADD COLUMN "telegramCode" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "telegramChatId" TEXT;

-- AlterTable
ALTER TABLE "Watch" ADD COLUMN "telegramChatId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_telegramCode_key" ON "Customer"("telegramCode");

