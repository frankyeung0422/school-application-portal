-- CreateTable
CREATE TABLE "RetailerConfig" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "deliveryFeeCents" INTEGER,
    "freeDeliveryOverCents" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "segment" TEXT NOT NULL DEFAULT 'GLOBAL',
    "externalKey" TEXT,
    "brand" TEXT,
    "imageUrl" TEXT,
    "category" TEXT,
    "keyword" TEXT NOT NULL,
    "packQty" INTEGER,
    "unitSize" TEXT,
    "restricted" BOOLEAN NOT NULL DEFAULT false,
    "restrictedReason" TEXT,
    "fulfilMode" TEXT NOT NULL DEFAULT 'AFFILIATE',
    "fulfilApprovedAt" DATETIME,
    "bestLandedHkdCents" INTEGER,
    "bestOfferId" INTEGER,
    "historicalLowHkdCents" INTEGER,
    "sourceCount" INTEGER NOT NULL DEFAULT 0,
    "lastPricedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("bestLandedHkdCents", "bestOfferId", "brand", "category", "createdAt", "fulfilApprovedAt", "fulfilMode", "historicalLowHkdCents", "id", "imageUrl", "keyword", "lastPricedAt", "packQty", "restricted", "restrictedReason", "slug", "sourceCount", "title", "unitSize", "updatedAt") SELECT "bestLandedHkdCents", "bestOfferId", "brand", "category", "createdAt", "fulfilApprovedAt", "fulfilMode", "historicalLowHkdCents", "id", "imageUrl", "keyword", "lastPricedAt", "packQty", "restricted", "restrictedReason", "slug", "sourceCount", "title", "unitSize", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE UNIQUE INDEX "Product_externalKey_key" ON "Product"("externalKey");
CREATE INDEX "Product_keyword_idx" ON "Product"("keyword");
CREATE INDEX "Product_segment_category_idx" ON "Product"("segment", "category");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

