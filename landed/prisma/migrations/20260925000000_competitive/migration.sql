-- AlterTable
ALTER TABLE "Offer" ADD COLUMN "dimsCm" TEXT;

-- CreateTable
CREATE TABLE "KeywordAlert" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "customerId" INTEGER,
    "telegramChatId" TEXT,
    "maxHkdCents" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "KeywordAlertHit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "alertId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "stateKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KeywordAlertHit_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "KeywordAlert" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SourceConfig" (
    "platform" TEXT NOT NULL PRIMARY KEY,
    "country" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "shipToHkHkd" REAL NOT NULL DEFAULT 0,
    "freeShipOverNative" REAL,
    "domesticShipNative" REAL NOT NULL DEFAULT 0,
    "viaForwarder" BOOLEAN NOT NULL DEFAULT false,
    "forwarderPerKgHkd" REAL NOT NULL DEFAULT 0,
    "forwarderMinHkd" REAL NOT NULL DEFAULT 0,
    "assumedWeightKg" REAL NOT NULL DEFAULT 0.5,
    "cardFxMarkupPct" REAL NOT NULL DEFAULT 0.0195,
    "paymentFeePct" REAL NOT NULL DEFAULT 0,
    "importDutyPct" REAL NOT NULL DEFAULT 0,
    "officialFreeToPickup" BOOLEAN NOT NULL DEFAULT false,
    "officialFreeMaxKg" REAL,
    "homeDeliverySurchargeHkd" REAL NOT NULL DEFAULT 0,
    "volumetricDivisor" REAL NOT NULL DEFAULT 6000,
    "affiliateCommissionPct" REAL NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_SourceConfig" ("affiliateCommissionPct", "assumedWeightKg", "cardFxMarkupPct", "country", "currency", "domesticShipNative", "enabled", "forwarderMinHkd", "forwarderPerKgHkd", "freeShipOverNative", "importDutyPct", "paymentFeePct", "platform", "shipToHkHkd", "viaForwarder") SELECT "affiliateCommissionPct", "assumedWeightKg", "cardFxMarkupPct", "country", "currency", "domesticShipNative", "enabled", "forwarderMinHkd", "forwarderPerKgHkd", "freeShipOverNative", "importDutyPct", "paymentFeePct", "platform", "shipToHkHkd", "viaForwarder" FROM "SourceConfig";
DROP TABLE "SourceConfig";
ALTER TABLE "new_SourceConfig" RENAME TO "SourceConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "KeywordAlert_email_keyword_key" ON "KeywordAlert"("email", "keyword");

-- CreateIndex
CREATE UNIQUE INDEX "KeywordAlertHit_alertId_productId_stateKey_key" ON "KeywordAlertHit"("alertId", "productId", "stateKey");


-- Data: Taobao's official consolidation ships free to HK pickup points since 2025-08.
-- Ballpark cap / door surcharge; editable on /admin/settings.
UPDATE "SourceConfig" SET "officialFreeToPickup" = true, "officialFreeMaxKg" = 3, "homeDeliverySurchargeHkd" = 20 WHERE "platform" = 'TAOBAO';
