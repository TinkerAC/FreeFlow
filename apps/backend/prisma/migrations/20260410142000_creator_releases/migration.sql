-- CreateEnum
CREATE TYPE "CreatorReleaseStatus" AS ENUM (
    'DRAFT',
    'ASSETS_PENDING',
    'ASSETS_UPLOADED',
    'METADATA_UPLOADED',
    'PUBLISHING',
    'PUBLISHED',
    'FAILED',
    'CANCELLED'
);

-- CreateTable
CREATE TABLE "creator_releases" (
    "id" TEXT NOT NULL,
    "creatorUserId" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "artistName" VARCHAR(255),
    "albumName" VARCHAR(255),
    "genreLabel" VARCHAR(255),
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "CreatorReleaseStatus" NOT NULL DEFAULT 'DRAFT',
    "currentStage" VARCHAR(32) NOT NULL DEFAULT 'editor',
    "accessModel" VARCHAR(32) NOT NULL DEFAULT 'purchase',
    "previewSeconds" INTEGER NOT NULL DEFAULT 30,
    "priceEth" VARCHAR(64) NOT NULL DEFAULT '0',
    "royaltyBps" INTEGER NOT NULL DEFAULT 1000,
    "audioSourceName" VARCHAR(255),
    "audioSourcePath" TEXT,
    "coverSourceName" VARCHAR(255),
    "coverSourcePath" TEXT,
    "audioCid" VARCHAR(255),
    "audioGatewayUrl" TEXT,
    "coverCid" VARCHAR(255),
    "coverGatewayUrl" TEXT,
    "metadataCid" VARCHAR(255),
    "metadataUri" TEXT,
    "metadataGatewayUrl" TEXT,
    "splitterAddress" VARCHAR(42),
    "publishTxHash" VARCHAR(100),
    "purchaseTxHash" VARCHAR(100),
    "tokenId" VARCHAR(128),
    "chainId" INTEGER,
    "chainName" VARCHAR(64),
    "explorerUrl" TEXT,
    "musicAssetAddress" VARCHAR(42),
    "royaltySplitterFactoryAddress" VARCHAR(42),
    "platformHubAddress" VARCHAR(42),
    "metadataDocument" JSONB,
    "royaltySplits" JSONB,
    "activityLog" JSONB,
    "statusMessage" VARCHAR(255),
    "latestError" TEXT,
    "publishedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_releases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "creator_releases_creatorUserId_updatedAt_idx" ON "creator_releases"("creatorUserId", "updatedAt");

-- CreateIndex
CREATE INDEX "creator_releases_creatorUserId_status_updatedAt_idx" ON "creator_releases"("creatorUserId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "creator_releases_chainId_tokenId_idx" ON "creator_releases"("chainId", "tokenId");

-- CreateIndex
CREATE INDEX "creator_releases_creatorUserId_slug_idx" ON "creator_releases"("creatorUserId", "slug");

-- AddForeignKey
ALTER TABLE "creator_releases" ADD CONSTRAINT "creator_releases_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
