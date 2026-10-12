-- Genres principaux d'un livre (slugs définis dans src/lib/genres.ts)
ALTER TABLE "Book" ADD COLUMN "genres" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
