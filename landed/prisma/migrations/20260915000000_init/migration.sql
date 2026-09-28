-- CreateTable
CREATE TABLE "Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "Offer" (
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
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL,
    "lastCheckedAt" DATETIME,
    CONSTRAINT "Offer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Offer_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OfferSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "offerId" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "landedHkdCents" INTEGER,
    "jobId" INTEGER,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OfferSnapshot_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatchPair" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "offerAId" INTEGER NOT NULL,
    "offerBId" INTEGER NOT NULL,
    "verdict" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "variantNote" TEXT,
    "reason" TEXT,
    "model" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "platform" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "fulfilmentMode" TEXT NOT NULL DEFAULT 'AFFILIATE_ONLY',
    "ordersPlaced" INTEGER NOT NULL DEFAULT 0,
    "ordersFilled" INTEGER NOT NULL DEFAULT 0,
    "ordersDefective" INTEGER NOT NULL DEFAULT 0,
    "avgShipDays" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SourceConfig" (
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
    "affiliateCommissionPct" REAL NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "FxQuote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "base" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "mid" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FxRail" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "bps" INTEGER NOT NULL,
    "minFeeHkdCents" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "SearchQuery" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "normalized" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "lastSearchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCrawledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Watch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "customerId" INTEGER,
    "email" TEXT NOT NULL,
    "targetHkdCents" INTEGER,
    "lastNotifiedCents" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Watch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Watch_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AffiliateClick" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER,
    "offerId" INTEGER NOT NULL,
    "sessionId" TEXT,
    "referrer" TEXT,
    "tracked" BOOLEAN NOT NULL DEFAULT false,
    "landedHkdCents" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AffiliateClick_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AffiliateClick_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EligibilityReview" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "evidence" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "missing" TEXT NOT NULL,
    "actionRequestId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EligibilityReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "providerCustomer" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" INTEGER NOT NULL,
    "offerId" INTEGER NOT NULL,
    "customerId" INTEGER,
    "qty" INTEGER NOT NULL,
    "unitPriceHkdCents" INTEGER NOT NULL,
    "totalHkdCents" INTEGER NOT NULL,
    "lockedCostHkdCents" INTEGER NOT NULL,
    "fxMid" REAL NOT NULL,
    "fxBufferPct" REAL NOT NULL,
    "rail" TEXT NOT NULL,
    "breakdown" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Quote_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Quote_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "customerId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'QUOTED',
    "channel" TEXT NOT NULL DEFAULT 'STOREFRONT',
    "externalOrderRef" TEXT,
    "totalHkdCents" INTEGER NOT NULL,
    "shipping" TEXT,
    "realness" TEXT NOT NULL DEFAULT 'TEST',
    "providerSessionId" TEXT,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "quoteId" TEXT,
    "qty" INTEGER NOT NULL,
    "unitPriceHkdCents" INTEGER NOT NULL,
    "lockedCostHkdCents" INTEGER NOT NULL,
    "fxMid" REAL NOT NULL,
    "offerId" INTEGER NOT NULL,
    CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplierOrder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" TEXT,
    "poolId" INTEGER,
    "offerId" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "expectedCostHkdCents" INTEGER NOT NULL,
    "actualCostHkdCents" INTEGER,
    "rail" TEXT NOT NULL,
    "fxMid" REAL NOT NULL DEFAULT 1,
    "fxBufferPct" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'TASK_OPEN',
    "mode" TEXT NOT NULL,
    "routingReason" TEXT NOT NULL,
    "fallbackOfferIds" TEXT NOT NULL DEFAULT '[]',
    "externalRef" TEXT,
    "trackingNo" TEXT,
    "shipmentId" INTEGER,
    "actionRequestId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "placedAt" DATETIME,
    CONSTRAINT "SupplierOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SupplierOrder_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SupplierOrder_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SupplierOrder_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "forwarder" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONSOLIDATING',
    "weightKg" REAL,
    "costHkdCents" INTEGER,
    "trackingNo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" TEXT,
    "commitmentId" INTEGER,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amountHkdCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "realness" TEXT NOT NULL DEFAULT 'TEST',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PaymentRecord_commitmentId_fkey" FOREIGN KEY ("commitmentId") REFERENCES "PoolCommitment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Pool" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "offerId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "ladder" TEXT NOT NULL,
    "singleUnitHkdCents" INTEGER NOT NULL,
    "committedQty" INTEGER NOT NULL DEFAULT 0,
    "deadline" DATETIME NOT NULL,
    "exposureHkdCents" INTEGER NOT NULL DEFAULT 0,
    "outcome" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlockedAt" DATETIME,
    CONSTRAINT "Pool_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pool_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PoolCommitment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "poolId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "maxUnitHkdCents" INTEGER NOT NULL,
    "paymentMethodRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_SETUP',
    "authorizationRef" TEXT,
    "chargedUnitHkdCents" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PoolCommitment_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PoolCommitment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kind" TEXT NOT NULL,
    "amountHkdCents" INTEGER NOT NULL,
    "realness" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "orderId" TEXT,
    "poolId" INTEGER,
    "productId" INTEGER,
    "channel" TEXT,
    "memo" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" DATETIME,
    "reversedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CapitalEnvelope" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "version" INTEGER NOT NULL,
    "maxOpenExposureHkdCents" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ChannelAccount" (
    "platform" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
    "displayName" TEXT,
    "commissionPct" REAL NOT NULL DEFAULT 0,
    "paymentFeePct" REAL NOT NULL DEFAULT 0,
    "fixedFeeHkdCents" INTEGER NOT NULL DEFAULT 0,
    "marginFloorPct" REAL NOT NULL DEFAULT 0.08,
    "lastError" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChannelListing" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "priceHkdCents" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 5,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "lastGuardCheckAt" DATETIME,
    "lastGuardVerdict" TEXT,
    "delistReason" TEXT,
    "actionRequestId" TEXT,
    "dryRun" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChannelListing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER,
    "platform" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "externalId" TEXT,
    "lintIssues" TEXT NOT NULL DEFAULT '[]',
    "actionRequestId" TEXT,
    "dryRun" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SocialPost_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "dedupeKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME
);

-- CreateTable
CREATE TABLE "ActionRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "preview" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "policyMode" TEXT NOT NULL,
    "runMode" TEXT NOT NULL,
    "reason" TEXT,
    "result" TEXT,
    "idempotencyKey" TEXT,
    "requestedBy" TEXT NOT NULL DEFAULT 'system',
    "decidedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" DATETIME,
    "executedAt" DATETIME
);

-- CreateTable
CREATE TABLE "ActionAudit" (
    "seq" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "prevHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "actionId" TEXT,
    "detail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ActionPolicy" (
    "kind" TEXT NOT NULL PRIMARY KEY,
    "mode" TEXT NOT NULL,
    "dailyLimit" INTEGER
);

-- CreateTable
CREATE TABLE "SystemFlag" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Job" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payload" TEXT NOT NULL DEFAULT '{}',
    "result" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "dedupeKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "heartbeatAt" DATETIME,
    "finishedAt" DATETIME
);

-- CreateTable
CREATE TABLE "PlatformSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOGGED_OUT',
    "profileDir" TEXT,
    "lastCheckedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_keyword_idx" ON "Product"("keyword");

-- CreateIndex
CREATE INDEX "Offer_keyword_idx" ON "Offer"("keyword");

-- CreateIndex
CREATE INDEX "Offer_productId_idx" ON "Offer"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_platform_itemId_key" ON "Offer"("platform", "itemId");

-- CreateIndex
CREATE INDEX "OfferSnapshot_offerId_capturedAt_idx" ON "OfferSnapshot"("offerId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MatchPair_offerAId_offerBId_key" ON "MatchPair"("offerAId", "offerBId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_platform_shopName_key" ON "Supplier"("platform", "shopName");

-- CreateIndex
CREATE UNIQUE INDEX "FxQuote_base_quote_key" ON "FxQuote"("base", "quote");

-- CreateIndex
CREATE UNIQUE INDEX "SearchQuery_normalized_key" ON "SearchQuery"("normalized");

-- CreateIndex
CREATE UNIQUE INDEX "Watch_productId_email_key" ON "Watch"("productId", "email");

-- CreateIndex
CREATE INDEX "AffiliateClick_productId_createdAt_idx" ON "AffiliateClick"("productId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "SupplierOrder_status_idx" ON "SupplierOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Pool_slug_key" ON "Pool"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PoolCommitment_poolId_customerId_key" ON "PoolCommitment"("poolId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_sourceRef_key" ON "LedgerEntry"("sourceRef");

-- CreateIndex
CREATE INDEX "LedgerEntry_kind_realness_idx" ON "LedgerEntry"("kind", "realness");

-- CreateIndex
CREATE UNIQUE INDEX "CapitalEnvelope_version_key" ON "CapitalEnvelope"("version");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelListing_productId_platform_key" ON "ChannelListing"("productId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "ActionRequest_idempotencyKey_key" ON "ActionRequest"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ActionRequest_status_kind_idx" ON "ActionRequest"("status", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "ActionAudit_prevHash_key" ON "ActionAudit"("prevHash");

-- CreateIndex
CREATE INDEX "Job_status_createdAt_idx" ON "Job"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Job_type_dedupeKey_idx" ON "Job"("type", "dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSession_platform_key" ON "PlatformSession"("platform");

