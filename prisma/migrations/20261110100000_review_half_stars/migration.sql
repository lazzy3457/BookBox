-- Demi-étoiles : la note passe d'un entier (1 à 5) à un décimal par pas de 0,5 (0,5 à 5).
ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_rating_check";

-- AlterTable
ALTER TABLE "Review" ALTER COLUMN "rating" SET DATA TYPE DOUBLE PRECISION;

ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_check" CHECK ("rating" BETWEEN 0.5 AND 5 AND "rating" * 2 = FLOOR("rating" * 2)) NOT VALID;
