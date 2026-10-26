-- Index sur les clés étrangères interrogées seules (les @@unique composites ne couvrent que leur première colonne)
CREATE INDEX "UserBook_bookId_idx" ON "UserBook"("bookId");

CREATE INDEX "Review_bookId_idx" ON "Review"("bookId");

CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

CREATE INDEX "BookListEntry_bookId_idx" ON "BookListEntry"("bookId");
