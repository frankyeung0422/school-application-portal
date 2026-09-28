-- CreateTable
CREATE TABLE "StoreLocation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "retailer" TEXT NOT NULL,
    "osmType" TEXT NOT NULL,
    "osmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "StoreLocation_retailer_idx" ON "StoreLocation"("retailer");

-- CreateIndex
CREATE UNIQUE INDEX "StoreLocation_osmType_osmId_key" ON "StoreLocation"("osmType", "osmId");

