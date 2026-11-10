-- Avis par chapitre : "chapter" vaut 0 pour l'avis sur le livre entier, N pour le chapitre N.
-- AlterTable
ALTER TABLE "Review" ADD COLUMN "chapter" INTEGER NOT NULL DEFAULT 0;

-- DropIndex
DROP INDEX "Review_userId_bookId_key";

-- DropIndex
DROP INDEX "Review_bookId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_bookId_chapter_key" ON "Review"("userId", "bookId", "chapter");

-- CreateIndex
CREATE INDEX "Review_bookId_chapter_idx" ON "Review"("bookId", "chapter");

ALTER TABLE "Review" ADD CONSTRAINT "Review_chapter_check" CHECK ("chapter" BETWEEN 0 AND 999) NOT VALID;

-- CreateTable
CREATE TABLE "ChapterProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChapterProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChapterProgress_userId_bookId_key" ON "ChapterProgress"("userId", "bookId");

-- CreateIndex
CREATE INDEX "ChapterProgress_bookId_idx" ON "ChapterProgress"("bookId");

ALTER TABLE "ChapterProgress" ADD CONSTRAINT "ChapterProgress_chapter_check" CHECK ("chapter" BETWEEN 0 AND 999) NOT VALID;

-- AddForeignKey
ALTER TABLE "ChapterProgress" ADD CONSTRAINT "ChapterProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterProgress" ADD CONSTRAINT "ChapterProgress_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
