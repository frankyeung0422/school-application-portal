-- AlterTable
ALTER TABLE "AffiliateClick" ADD COLUMN "medianHkdCents" INTEGER;

-- CreateTable
CREATE TABLE "PageEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" TEXT NOT NULL,
    "event" TEXT NOT NULL DEFAULT 'view',
    "path" TEXT NOT NULL,
    "refHost" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SavedBasket" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "lines" TEXT NOT NULL DEFAULT '[]',
    "digestOptIn" BOOLEAN NOT NULL DEFAULT false,
    "lastDigestAt" DATETIME,
    "lastBestCents" INTEGER,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedBasket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Watch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "customerId" INTEGER,
    "email" TEXT NOT NULL,
    "telegramChatId" TEXT,
    "targetHkdCents" INTEGER,
    "lastNotifiedCents" INTEGER,
    "kind" TEXT NOT NULL DEFAULT 'PRICE',
    "lastPromoKey" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Watch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Watch_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Watch" ("active", "createdAt", "customerId", "email", "id", "lastNotifiedCents", "productId", "targetHkdCents", "telegramChatId") SELECT "active", "createdAt", "customerId", "email", "id", "lastNotifiedCents", "productId", "targetHkdCents", "telegramChatId" FROM "Watch";
DROP TABLE "Watch";
ALTER TABLE "new_Watch" RENAME TO "Watch";
CREATE UNIQUE INDEX "Watch_productId_email_key" ON "Watch"("productId", "email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PageEvent_createdAt_idx" ON "PageEvent"("createdAt");

-- CreateIndex
CREATE INDEX "PageEvent_sessionId_createdAt_idx" ON "PageEvent"("sessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedBasket_customerId_key" ON "SavedBasket"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_email_idx" ON "PushSubscription"("email");

