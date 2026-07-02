-- CreateTable
CREATE TABLE "ReadingPeriod" (
    "id" TEXT NOT NULL,
    "userBookId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "isReread" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReadingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingEntry" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "page" INTEGER,
    "percentage" INTEGER,
    "chapter" TEXT,
    "note" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReadingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationDismissal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecommendationDismissal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReadingPeriod_userBookId_startedAt_idx" ON "ReadingPeriod"("userBookId", "startedAt");
CREATE INDEX "ReadingEntry_periodId_entryDate_idx" ON "ReadingEntry"("periodId", "entryDate");
CREATE INDEX "ReadingEntry_isPublic_entryDate_idx" ON "ReadingEntry"("isPublic", "entryDate");
CREATE UNIQUE INDEX "RecommendationDismissal_userId_bookId_key" ON "RecommendationDismissal"("userId", "bookId");
CREATE INDEX "RecommendationDismissal_userId_idx" ON "RecommendationDismissal"("userId");

ALTER TABLE "ReadingPeriod" ADD CONSTRAINT "ReadingPeriod_userBookId_fkey" FOREIGN KEY ("userBookId") REFERENCES "UserBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReadingEntry" ADD CONSTRAINT "ReadingEntry_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ReadingPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecommendationDismissal" ADD CONSTRAINT "RecommendationDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecommendationDismissal" ADD CONSTRAINT "RecommendationDismissal_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve existing libraries by creating one editable historical reading period
-- only where a reading has actually started.
INSERT INTO "ReadingPeriod" ("id", "userBookId", "startedAt", "finishedAt", "isReread", "createdAt", "updatedAt")
SELECT
  'legacy_' || "id",
  "id",
  "createdAt",
  CASE WHEN "status" = 'READ' THEN "updatedAt" ELSE NULL END,
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "UserBook"
WHERE "status" IN ('READING', 'READ', 'ABANDONED');
