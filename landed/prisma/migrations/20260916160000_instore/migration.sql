-- CreateTable
CREATE TABLE "StorePriceReport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER,
    "itemName" TEXT,
    "retailer" TEXT NOT NULL,
    "branch" TEXT,
    "priceCents" INTEGER NOT NULL,
    "photoPath" TEXT,
    "note" TEXT,
    "seenAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectedReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "reporterEmail" TEXT,
    "reporterKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StorePriceReport_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StorePriceReport_status_createdAt_idx" ON "StorePriceReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StorePriceReport_productId_status_idx" ON "StorePriceReport"("productId", "status");

