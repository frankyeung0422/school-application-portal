-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SearchQuery" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "normalized" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "lastSearchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCrawledAt" DATETIME,
    "signature" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_SearchQuery" ("count", "createdAt", "display", "id", "lastCrawledAt", "lastSearchedAt", "normalized") SELECT "count", "createdAt", "display", "id", "lastCrawledAt", "lastSearchedAt", "normalized" FROM "SearchQuery";
DROP TABLE "SearchQuery";
ALTER TABLE "new_SearchQuery" RENAME TO "SearchQuery";
CREATE UNIQUE INDEX "SearchQuery_normalized_key" ON "SearchQuery"("normalized");
CREATE INDEX "SearchQuery_signature_idx" ON "SearchQuery"("signature");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

