-- CreateTable
CREATE TABLE "AffiliateCommission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "programme" TEXT NOT NULL,
    "externalRef" TEXT NOT NULL,
    "subId" TEXT,
    "clickId" INTEGER,
    "productId" INTEGER,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "amountHkdCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "occurredAt" TEXT,
    "ledgerRef" TEXT,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TravelClick" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quoteId" INTEGER,
    "searchId" INTEGER,
    "partner" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TravelClick_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TravelQuote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TravelClick" ("createdAt", "id", "quoteId") SELECT "createdAt", "id", "quoteId" FROM "TravelClick";
DROP TABLE "TravelClick";
ALTER TABLE "new_TravelClick" RENAME TO "TravelClick";
CREATE INDEX "TravelClick_quoteId_idx" ON "TravelClick"("quoteId");
CREATE INDEX "TravelClick_searchId_idx" ON "TravelClick"("searchId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AffiliateCommission_clickId_idx" ON "AffiliateCommission"("clickId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateCommission_programme_externalRef_key" ON "AffiliateCommission"("programme", "externalRef");

