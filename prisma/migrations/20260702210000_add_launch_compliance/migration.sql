CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "AccountTokenType" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');
CREATE TYPE "ModerationActionType" AS ENUM ('NONE', 'HIDE', 'RESTORE', 'SUSPEND', 'UNSUSPEND');

ALTER TABLE "User"
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER',
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "suspensionReason" TEXT;

ALTER TABLE "Review"
  ADD COLUMN "hiddenAt" TIMESTAMP(3),
  ADD COLUMN "hiddenReason" TEXT;

ALTER TABLE "ReviewComment"
  ADD COLUMN "hiddenAt" TIMESTAMP(3),
  ADD COLUMN "hiddenReason" TEXT;

ALTER TABLE "ModerationReport"
  ADD COLUMN "decisionReason" TEXT,
  ADD COLUMN "action" "ModerationActionType" NOT NULL DEFAULT 'NONE';

UPDATE "User" SET "emailVerified" = COALESCE("emailVerified", CURRENT_TIMESTAMP);

CREATE TABLE "LegalAcceptance" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "termsVersion" TEXT NOT NULL,
  "privacyVersion" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ageConfirmedAt" TIMESTAMP(3),
  "source" TEXT NOT NULL DEFAULT 'WEB',
  CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "AccountTokenType" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalNotice" (
  "id" TEXT NOT NULL,
  "trackingCode" TEXT NOT NULL,
  "reporterEmail" TEXT NOT NULL,
  "targetUrl" TEXT NOT NULL,
  "legalGround" TEXT NOT NULL,
  "explanation" TEXT NOT NULL,
  "goodFaith" BOOLEAN NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "decisionReason" TEXT,
  "action" "ModerationActionType" NOT NULL DEFAULT 'NONE',
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LegalNotice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModerationAction" (
  "id" TEXT NOT NULL,
  "moderatorId" TEXT NOT NULL,
  "reportId" TEXT,
  "legalNoticeId" TEXT,
  "targetType" "ReportTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "action" "ModerationActionType" NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModerationAppeal" (
  "id" TEXT NOT NULL,
  "legalNoticeId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "response" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ModerationAppeal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountToken_tokenHash_key" ON "AccountToken"("tokenHash");
CREATE UNIQUE INDEX "LegalNotice_trackingCode_key" ON "LegalNotice"("trackingCode");
CREATE INDEX "LegalAcceptance_userId_acceptedAt_idx" ON "LegalAcceptance"("userId", "acceptedAt");
CREATE INDEX "AccountToken_userId_type_idx" ON "AccountToken"("userId", "type");
CREATE INDEX "AccountToken_expiresAt_idx" ON "AccountToken"("expiresAt");
CREATE INDEX "LegalNotice_status_createdAt_idx" ON "LegalNotice"("status", "createdAt");
CREATE INDEX "ModerationAction_targetType_targetId_createdAt_idx" ON "ModerationAction"("targetType", "targetId", "createdAt");
CREATE INDEX "ModerationAction_moderatorId_createdAt_idx" ON "ModerationAction"("moderatorId", "createdAt");
CREATE INDEX "ModerationAppeal_legalNoticeId_createdAt_idx" ON "ModerationAppeal"("legalNoticeId", "createdAt");
CREATE INDEX "ModerationAppeal_status_createdAt_idx" ON "ModerationAppeal"("status", "createdAt");

ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountToken" ADD CONSTRAINT "AccountToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ModerationAppeal" ADD CONSTRAINT "ModerationAppeal_legalNoticeId_fkey" FOREIGN KEY ("legalNoticeId") REFERENCES "LegalNotice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "LegalAcceptance" ("id", "userId", "termsVersion", "privacyVersion", "acceptedAt", "source")
SELECT md5(random()::text || "id"), "id", '2026-07-02', '2026-07-02', CURRENT_TIMESTAMP, 'LEGACY_MIGRATION'
FROM "User";
