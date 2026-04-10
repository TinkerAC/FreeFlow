CREATE TYPE "CommentStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'DELETED');
CREATE TYPE "ResourceType" AS ENUM ('TRACK', 'ALBUM', 'POST');

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "displayName" VARCHAR(64),
    "avatarUrl" TEXT,
    "primaryWalletAddress" VARCHAR(42) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wallet_identities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" VARCHAR(42) NOT NULL,
    "addressLower" VARCHAR(42) NOT NULL,
    "chainId" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "lastAuthenticatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_identities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "siwe_nonces" (
    "id" TEXT NOT NULL,
    "nonceHash" CHAR(64) NOT NULL,
    "requestedAddress" VARCHAR(42),
    "requestedAddressLower" VARCHAR(42),
    "requestedChainId" INTEGER,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "siwe_nonces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletIdentityId" TEXT NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "address" VARCHAR(42) NOT NULL,
    "chainId" INTEGER NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "uri" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "storage_objects" (
    "id" TEXT NOT NULL,
    "uploaderUserId" TEXT NOT NULL,
    "cid" VARCHAR(255) NOT NULL,
    "pinataId" VARCHAR(255),
    "name" VARCHAR(255) NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" VARCHAR(255) NOT NULL,
    "gatewayUrl" TEXT NOT NULL,
    "network" VARCHAR(32) NOT NULL,
    "groupId" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storage_objects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "chainId" INTEGER,
    "contractAddress" VARCHAR(42),
    "contractAddressLower" VARCHAR(42),
    "tokenId" VARCHAR(128),
    "contentCid" VARCHAR(255),
    "title" VARCHAR(255),
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "status" "CommentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "comment_reactions" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reactionType" VARCHAR(32) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_reactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "comment_reports" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "reason" VARCHAR(64) NOT NULL,
    "details" TEXT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comment_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "comment_moderation_logs" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "moderatorUserId" TEXT,
    "action" VARCHAR(32) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_moderation_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wallet_identities_addressLower_chainId_key" ON "wallet_identities"("addressLower", "chainId");
CREATE UNIQUE INDEX "siwe_nonces_nonceHash_key" ON "siwe_nonces"("nonceHash");
CREATE UNIQUE INDEX "auth_sessions_tokenHash_key" ON "auth_sessions"("tokenHash");
CREATE UNIQUE INDEX "storage_objects_cid_key" ON "storage_objects"("cid");
CREATE UNIQUE INDEX "resources_chainId_contractAddressLower_tokenId_key" ON "resources"("chainId", "contractAddressLower", "tokenId");
CREATE UNIQUE INDEX "comment_reactions_commentId_userId_reactionType_key" ON "comment_reactions"("commentId", "userId", "reactionType");

CREATE INDEX "users_primaryWalletAddress_idx" ON "users"("primaryWalletAddress");
CREATE INDEX "wallet_identities_userId_idx" ON "wallet_identities"("userId");
CREATE INDEX "siwe_nonces_expiresAt_idx" ON "siwe_nonces"("expiresAt");
CREATE INDEX "siwe_nonces_requestedAddressLower_requestedChainId_idx" ON "siwe_nonces"("requestedAddressLower", "requestedChainId");
CREATE INDEX "auth_sessions_userId_idx" ON "auth_sessions"("userId");
CREATE INDEX "auth_sessions_walletIdentityId_idx" ON "auth_sessions"("walletIdentityId");
CREATE INDEX "auth_sessions_expiresAt_revokedAt_idx" ON "auth_sessions"("expiresAt", "revokedAt");
CREATE INDEX "storage_objects_uploaderUserId_createdAt_idx" ON "storage_objects"("uploaderUserId", "createdAt");
CREATE INDEX "resources_contentCid_idx" ON "resources"("contentCid");
CREATE INDEX "resources_ownerUserId_idx" ON "resources"("ownerUserId");
CREATE INDEX "comments_resourceId_createdAt_idx" ON "comments"("resourceId", "createdAt");
CREATE INDEX "comments_parentId_createdAt_idx" ON "comments"("parentId", "createdAt");
CREATE INDEX "comments_userId_createdAt_idx" ON "comments"("userId", "createdAt");
CREATE INDEX "comment_reactions_userId_idx" ON "comment_reactions"("userId");
CREATE INDEX "comment_reports_commentId_idx" ON "comment_reports"("commentId");
CREATE INDEX "comment_reports_reporterUserId_idx" ON "comment_reports"("reporterUserId");
CREATE INDEX "comment_moderation_logs_commentId_createdAt_idx" ON "comment_moderation_logs"("commentId", "createdAt");
CREATE INDEX "comment_moderation_logs_moderatorUserId_idx" ON "comment_moderation_logs"("moderatorUserId");

ALTER TABLE "wallet_identities"
    ADD CONSTRAINT "wallet_identities_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth_sessions"
    ADD CONSTRAINT "auth_sessions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth_sessions"
    ADD CONSTRAINT "auth_sessions_walletIdentityId_fkey"
    FOREIGN KEY ("walletIdentityId") REFERENCES "wallet_identities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "storage_objects"
    ADD CONSTRAINT "storage_objects_uploaderUserId_fkey"
    FOREIGN KEY ("uploaderUserId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resources"
    ADD CONSTRAINT "resources_ownerUserId_fkey"
    FOREIGN KEY ("ownerUserId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "comments"
    ADD CONSTRAINT "comments_resourceId_fkey"
    FOREIGN KEY ("resourceId") REFERENCES "resources"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comments"
    ADD CONSTRAINT "comments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comments"
    ADD CONSTRAINT "comments_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "comments"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "comment_reactions"
    ADD CONSTRAINT "comment_reactions_commentId_fkey"
    FOREIGN KEY ("commentId") REFERENCES "comments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comment_reactions"
    ADD CONSTRAINT "comment_reactions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comment_reports"
    ADD CONSTRAINT "comment_reports_commentId_fkey"
    FOREIGN KEY ("commentId") REFERENCES "comments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comment_reports"
    ADD CONSTRAINT "comment_reports_reporterUserId_fkey"
    FOREIGN KEY ("reporterUserId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comment_moderation_logs"
    ADD CONSTRAINT "comment_moderation_logs_commentId_fkey"
    FOREIGN KEY ("commentId") REFERENCES "comments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comment_moderation_logs"
    ADD CONSTRAINT "comment_moderation_logs_moderatorUserId_fkey"
    FOREIGN KEY ("moderatorUserId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
