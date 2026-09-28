-- AlterTable
ALTER TABLE "Product" ADD COLUMN "officialRef" TEXT;

-- CreateTable
CREATE TABLE "OfficialPrice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brand" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "priceNative" REAL NOT NULL,
    "priceHkdCents" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "OfficialPrice_reference_idx" ON "OfficialPrice"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "OfficialPrice_brand_reference_market_key" ON "OfficialPrice"("brand", "reference", "market");

