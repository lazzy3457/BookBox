-- Un livre devient une œuvre avec plusieurs éditions.
-- Les identifiants externes (Google Books, Open Library, ISBN) passent de Book à Edition ;
-- chaque livre existant reçoit une édition reprenant les siens.
-- Après cette migration : npm run catalog:backfill (clés de rapprochement, fiches auteur, fusion des doublons).

-- CreateEnum
CREATE TYPE "AuthorRole" AS ENUM ('AUTHOR', 'TRANSLATOR', 'ILLUSTRATOR');

-- AlterTable
ALTER TABLE "Book" ADD COLUMN "openLibraryWorkKey" TEXT,
ADD COLUMN "matchKey" TEXT;

-- AlterTable
ALTER TABLE "UserBook" ADD COLUMN "editionId" TEXT;

-- CreateTable
CREATE TABLE "Edition" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "googleBooksVolumeId" TEXT,
    "openLibraryKey" TEXT,
    "isbn13" TEXT,
    "title" TEXT,
    "publisher" TEXT,
    "publishedDate" TEXT,
    "pageCount" INTEGER,
    "language" TEXT,
    "thumbnailUrl" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Edition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Author" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "openLibraryKey" TEXT,
    "isni" TEXT,
    "viaf" TEXT,
    "bnfArk" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookAuthor" (
    "bookId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "role" "AuthorRole" NOT NULL DEFAULT 'AUTHOR',
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BookAuthor_pkey" PRIMARY KEY ("bookId","authorId","role")
);

-- CreateTable
CREATE TABLE "BookRedirect" (
    "fromId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookRedirect_pkey" PRIMARY KEY ("fromId")
);

-- Reprise : la clé d'œuvre Open Library reste sur le livre (« /works/OL45804W » → « OL45804W »).
UPDATE "Book"
SET "openLibraryWorkKey" = regexp_replace("openLibraryKey", '^/works/', '')
WHERE "openLibraryKey" ~ '^(/works/)?OL[0-9]+W$';

-- ISBN-10 → ISBN-13 (préfixe 978 et clé de contrôle recalculée).
CREATE FUNCTION pg_temp.isbn10_to_13(isbn TEXT) RETURNS TEXT AS $$
  SELECT core || ((10 - (SUM(substr(core, i, 1)::int * CASE WHEN i % 2 = 1 THEN 1 ELSE 3 END) % 10)) % 10)::text
  FROM (SELECT '978' || left(isbn, 9) AS core) AS c, generate_series(1, 12) AS i
  GROUP BY core
$$ LANGUAGE sql IMMUTABLE;

-- ISBN d'une édition : le premier ISBN-13 valide, sinon le premier ISBN-10 converti.
-- Une fiche qui porte plus de 4 ISBN mélange plusieurs éditions (anciens imports faits
-- au niveau de l'œuvre) : aucun ne peut servir d'identifiant.
CREATE FUNCTION pg_temp.edition_isbn(isbn13 TEXT[], isbn10 TEXT[]) RETURNS TEXT AS $$
  SELECT CASE
    WHEN cardinality(isbn13) + cardinality(isbn10) > 4 THEN NULL
    ELSE COALESCE(
      (SELECT value FROM unnest(isbn13) WITH ORDINALITY AS t(value, position) WHERE value ~ '^97[89][0-9]{10}$' ORDER BY position LIMIT 1),
      (SELECT pg_temp.isbn10_to_13(value) FROM unnest(isbn10) WITH ORDINALITY AS t(value, position) WHERE value ~ '^[0-9]{9}[0-9X]$' ORDER BY position LIMIT 1)
    )
  END
$$ LANGUAGE sql IMMUTABLE;

-- Reprise : une édition par livre existant. Quand deux livres portent le même ISBN,
-- seul le plus ancien le garde ; catalog:backfill fusionne ensuite les doublons.
INSERT INTO "Edition" ("id", "bookId", "googleBooksVolumeId", "openLibraryKey", "isbn13", "title", "publisher", "publishedDate", "pageCount", "language", "thumbnailUrl", "source", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  b."id",
  b."googleBooksVolumeId",
  CASE WHEN b."openLibraryKey" ~ '^OL[0-9]+M$' THEN b."openLibraryKey" END,
  CASE WHEN row_number() OVER (PARTITION BY i."isbn" ORDER BY b."createdAt", b."id") = 1 THEN i."isbn" END,
  b."title",
  b."publisher",
  b."publishedDate",
  b."pageCount",
  b."language",
  b."thumbnailUrl",
  b."source",
  b."createdAt",
  b."updatedAt"
FROM "Book" AS b
CROSS JOIN LATERAL (SELECT pg_temp.edition_isbn(b."isbn13", b."isbn10") AS "isbn") AS i;

-- Reprise : chaque lecteur possède, par défaut, l'édition de la fiche qu'il avait ajoutée.
UPDATE "UserBook" AS ub
SET "editionId" = e."id"
FROM "Edition" AS e
WHERE e."bookId" = ub."bookId";

-- DropIndex
DROP INDEX "Book_googleBooksVolumeId_key";
DROP INDEX "Book_openLibraryKey_key";
DROP INDEX "Book_isbn13_idx";
DROP INDEX "Book_isbn10_idx";

-- AlterTable
ALTER TABLE "Book" DROP COLUMN "googleBooksVolumeId",
DROP COLUMN "openLibraryKey",
DROP COLUMN "isbn10",
DROP COLUMN "isbn13";

-- CreateIndex
CREATE UNIQUE INDEX "Book_openLibraryWorkKey_key" ON "Book"("openLibraryWorkKey");
CREATE INDEX "Book_matchKey_idx" ON "Book"("matchKey");
CREATE UNIQUE INDEX "Edition_googleBooksVolumeId_key" ON "Edition"("googleBooksVolumeId");
CREATE UNIQUE INDEX "Edition_openLibraryKey_key" ON "Edition"("openLibraryKey");
CREATE UNIQUE INDEX "Edition_isbn13_key" ON "Edition"("isbn13");
CREATE INDEX "Edition_bookId_idx" ON "Edition"("bookId");
CREATE UNIQUE INDEX "Author_slug_key" ON "Author"("slug");
CREATE UNIQUE INDEX "Author_openLibraryKey_key" ON "Author"("openLibraryKey");
CREATE UNIQUE INDEX "Author_isni_key" ON "Author"("isni");
CREATE UNIQUE INDEX "Author_viaf_key" ON "Author"("viaf");
CREATE UNIQUE INDEX "Author_bnfArk_key" ON "Author"("bnfArk");
CREATE INDEX "Author_name_idx" ON "Author" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "BookAuthor_authorId_idx" ON "BookAuthor"("authorId");
CREATE INDEX "BookRedirect_bookId_idx" ON "BookRedirect"("bookId");
CREATE INDEX "UserBook_editionId_idx" ON "UserBook"("editionId");

-- AddForeignKey
ALTER TABLE "Edition" ADD CONSTRAINT "Edition_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookAuthor" ADD CONSTRAINT "BookAuthor_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookAuthor" ADD CONSTRAINT "BookAuthor_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookRedirect" ADD CONSTRAINT "BookRedirect_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBook" ADD CONSTRAINT "UserBook_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
