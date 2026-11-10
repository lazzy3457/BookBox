-- Recherche « contient » sur les titres, noms et pseudos : index trigrammes.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- La lecture commune d'un groupe devient une vraie clé étrangère : on détache d'abord les livres disparus.
UPDATE "Group" SET "readalongBookId" = NULL
WHERE "readalongBookId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Book" WHERE "Book"."id" = "Group"."readalongBookId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Book_title_idx" ON "Book" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Book_authors_idx" ON "Book" USING GIN ("authors");

-- CreateIndex
CREATE INDEX "Book_isbn13_idx" ON "Book" USING GIN ("isbn13");

-- CreateIndex
CREATE INDEX "Book_isbn10_idx" ON "Book" USING GIN ("isbn10");

-- CreateIndex
CREATE INDEX "Book_genres_idx" ON "Book" USING GIN ("genres");

-- CreateIndex
CREATE INDEX "Group_createdById_idx" ON "Group"("createdById");

-- CreateIndex
CREATE INDEX "Group_bookId_idx" ON "Group"("bookId");

-- CreateIndex
CREATE INDEX "Group_readalongBookId_idx" ON "Group"("readalongBookId");

-- CreateIndex
CREATE INDEX "GroupInvite_invitedById_idx" ON "GroupInvite"("invitedById");

-- CreateIndex
CREATE INDEX "GroupPost_authorId_idx" ON "GroupPost"("authorId");

-- CreateIndex
CREATE INDEX "GroupPostReaction_userId_idx" ON "GroupPostReaction"("userId");

-- CreateIndex
CREATE INDEX "GroupThread_authorId_idx" ON "GroupThread"("authorId");

-- CreateIndex
CREATE INDEX "GroupThread_bookId_idx" ON "GroupThread"("bookId");

-- CreateIndex
CREATE INDEX "GroupThreadReaction_userId_idx" ON "GroupThreadReaction"("userId");

-- CreateIndex
CREATE INDEX "PollVote_userId_idx" ON "PollVote"("userId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User" USING GIN ("username" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "User_name_idx" ON "User" USING GIN ("name" gin_trgm_ops);

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_readalongBookId_fkey" FOREIGN KEY ("readalongBookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Bornes des notes garanties par la base, plus seulement par la validation de l'API.
-- NOT VALID : appliqué aux nouvelles écritures sans bloquer la migration sur d'anciennes lignes.
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_check" CHECK ("rating" BETWEEN 1 AND 5) NOT VALID;
ALTER TABLE "BookList" ADD CONSTRAINT "BookList_rating_check" CHECK ("rating" IS NULL OR ("rating" >= 0 AND "rating" <= 5)) NOT VALID;
