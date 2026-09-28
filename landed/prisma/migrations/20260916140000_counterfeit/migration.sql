-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Offer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "platform" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "productId" INTEGER,
    "supplierId" INTEGER,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "shopName" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "latestPrice" REAL NOT NULL,
    "soldCount" INTEGER,
    "moq" INTEGER,
    "priceTiers" TEXT,
    "attributes" TEXT,
    "keyword" TEXT NOT NULL,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "packQty" INTEGER,
    "isAccessory" BOOLEAN NOT NULL DEFAULT false,
    "unitSize" TEXT,
    "rating" REAL,
    "reviewCount" INTEGER,
    "boughtPastMonth" INTEGER,
    "weightKg" REAL,
    "category" TEXT,
    "matchConfidence" REAL,
    "suspectCounterfeit" BOOLEAN NOT NULL DEFAULT false,
    "suspectReason" TEXT,
    "clearedBy" TEXT,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL,
    "lastCheckedAt" DATETIME,
    CONSTRAINT "Offer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Offer_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Offer" ("attributes", "boughtPastMonth", "category", "currency", "firstSeenAt", "id", "imageUrl", "inStock", "isAccessory", "itemId", "keyword", "lastCheckedAt", "lastSeenAt", "latestPrice", "matchConfidence", "moq", "packQty", "platform", "priceTiers", "productId", "rating", "reviewCount", "shopName", "soldCount", "supplierId", "title", "unitSize", "url", "weightKg") SELECT "attributes", "boughtPastMonth", "category", "currency", "firstSeenAt", "id", "imageUrl", "inStock", "isAccessory", "itemId", "keyword", "lastCheckedAt", "lastSeenAt", "latestPrice", "matchConfidence", "moq", "packQty", "platform", "priceTiers", "productId", "rating", "reviewCount", "shopName", "soldCount", "supplierId", "title", "unitSize", "url", "weightKg" FROM "Offer";
DROP TABLE "Offer";
ALTER TABLE "new_Offer" RENAME TO "Offer";
CREATE INDEX "Offer_keyword_idx" ON "Offer"("keyword");
CREATE INDEX "Offer_productId_idx" ON "Offer"("productId");
CREATE UNIQUE INDEX "Offer_platform_itemId_key" ON "Offer"("platform", "itemId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

