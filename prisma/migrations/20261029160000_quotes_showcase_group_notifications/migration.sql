-- CreateEnum
CREATE TYPE "ReadingEntryKind" AS ENUM ('NOTE', 'QUOTE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'GROUP_REPLY';
ALTER TYPE "NotificationType" ADD VALUE 'GROUP_MENTION';
ALTER TYPE "NotificationType" ADD VALUE 'GROUP_INVITE';
ALTER TYPE "NotificationType" ADD VALUE 'GROUP_THREAD';

-- AlterTable
ALTER TABLE "UserBook" ADD COLUMN     "showcaseRank" INTEGER;

-- AlterTable
ALTER TABLE "ReadingEntry" ADD COLUMN     "kind" "ReadingEntryKind" NOT NULL DEFAULT 'NOTE';

-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN     "groupsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "GroupMember" ADD COLUMN     "notifyAll" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ReadingEntryLike" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingEntryLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReadingEntryLike_userId_idx" ON "ReadingEntryLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingEntryLike_entryId_userId_key" ON "ReadingEntryLike"("entryId", "userId");

-- AddForeignKey
ALTER TABLE "ReadingEntryLike" ADD CONSTRAINT "ReadingEntryLike_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ReadingEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingEntryLike" ADD CONSTRAINT "ReadingEntryLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Les citations écrites depuis le journal étaient des notes entourées de « » : on les convertit.
UPDATE "ReadingEntry"
SET "kind" = 'QUOTE',
    "note" = btrim(regexp_replace(regexp_replace("note", '^\s*«\s*', ''), '\s*»\s*$', ''))
WHERE "note" LIKE '«%';
