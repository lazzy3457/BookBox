// Enregistre un vrai livre Open Library par le chemin de POST /api/books
// (schéma externalBookUpsertSchema puis upsertExternalBook), sans la session.
// ÉCRIT dans la base de DATABASE_URL, puis retire la fiche si ce test l'a créée.
import { expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { upsertExternalBook } from "@/server/services/books";
import { searchOpenLibrary } from "@/server/services/openLibrary";
import { externalBookUpsertSchema } from "@/server/validation/books";

it("enregistre « A Game of Thrones » depuis Open Library", async () => {
  const { items } = await searchOpenLibrary("game of thrones", 0, { pageSize: 5 });
  const candidate = items.find((book) => book.authors.some((author) => author.includes("Martin")));
  expect(candidate).toBeDefined();

  // Le corps passe par JSON, comme dans la vraie requête du front.
  const body = JSON.parse(JSON.stringify(candidate));
  const before = await prisma.book.findUnique({ where: { openLibraryKey: body.openLibraryKey } });
  const saved = await upsertExternalBook(externalBookUpsertSchema.parse(body));
  // Second envoi : même fiche, rien d'écrasé.
  const again = await upsertExternalBook(externalBookUpsertSchema.parse({ ...body, title: "Titre qui ne doit pas remplacer", publisher: "Autre éditeur" }));

  console.log("Envoyé →", body);
  console.log("En base →", {
    id: saved.id, title: saved.title, authors: saved.authors, publisher: saved.publisher, language: saved.language,
    publishedDate: saved.publishedDate, isbn10: saved.isbn10, isbn13: saved.isbn13, openLibraryKey: saved.openLibraryKey, source: saved.source
  });

  expect(again.id).toBe(saved.id);
  expect(again.title).toBe(saved.title);
  expect(again.publisher).toBe(saved.publisher);
  expect(saved.isbn10.length + saved.isbn13.length).toBeLessThanOrEqual(4);
  expect(saved.language ?? "").not.toHaveLength(3);

  if (!before) {
    await prisma.book.delete({ where: { id: saved.id } });
    console.log("Fiche de test retirée de la base.");
  } else {
    console.log("La fiche existait déjà : laissée en place.");
  }
  await prisma.$disconnect();
});
