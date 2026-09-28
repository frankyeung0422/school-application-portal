-- CreateTable
CREATE TABLE "TravelSearch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kind" TEXT NOT NULL,
    "paramsKey" TEXT NOT NULL,
    "params" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "source" TEXT,
    "searchUrl" TEXT,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "jobId" INTEGER,
    "error" TEXT,
    "fetchedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TravelQuote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "searchId" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "priceNative" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "totalHkdCents" INTEGER NOT NULL,
    "details" TEXT NOT NULL,
    "bookingUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TravelQuote_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "TravelSearch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TravelClick" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quoteId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TravelClick_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TravelQuote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SerpApiCall" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "engine" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FoodPlaceCache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cellKey" TEXT NOT NULL,
    "cuisine" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL,
    "places" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "TravelSearch_paramsKey_key" ON "TravelSearch"("paramsKey");

-- CreateIndex
CREATE INDEX "TravelQuote_searchId_rank_idx" ON "TravelQuote"("searchId", "rank");

-- CreateIndex
CREATE INDEX "TravelClick_quoteId_idx" ON "TravelClick"("quoteId");

-- CreateIndex
CREATE INDEX "SerpApiCall_createdAt_idx" ON "SerpApiCall"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FoodPlaceCache_cellKey_cuisine_source_key" ON "FoodPlaceCache"("cellKey", "cuisine", "source");

