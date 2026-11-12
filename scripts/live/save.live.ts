// Enregistre un vrai livre Open Library par le chemin de POST /api/books
// (schéma externalBookUpsertSchema puis upsertExternalBook), sans la session.
// ÉCRIT dans la base de DATABASE_URL, puis retire ce que ce test a créé.
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
  const bookCountBefore = await prisma.book.count();
  const editionCountBefore = await prisma.edition.count();
  const saved = await upsertExternalBook(externalBookUpsertSchema.parse(body));
  // Second envoi : même livre, même édition, rien d'écrasé.
  const again = await upsertExternalBook(externalBookUpsertSchema.parse({ ...body, title: "Titre qui ne doit pas remplacer", publisher: "Autre éditeur" }));
  const edition = await prisma.edition.findUniqueOrThrow({ where: { id: saved.editionId } });

  console.log("Envoyé →", body);
  console.log("Livre →", {
    id: saved.id, title: saved.title, authors: saved.authors, publisher: saved.publisher, language: saved.language,
    publishedDate: saved.publishedDate, openLibraryWorkKey: saved.openLibraryWorkKey, source: saved.source
  });
  console.log("Édition →", { isbn13: edition.isbn13, openLibraryKey: edition.openLibraryKey, pageCount: edition.pageCount });

  expect(again.id).toBe(saved.id);
  expect(again.editionId).toBe(saved.editionId);
  expect(again.title).toBe(saved.title);
  expect(again.publisher).toBe(saved.publisher);
  expect(edition.bookId).toBe(saved.id);
  expect(edition.isbn13 ?? "").toMatch(/^(97[89]\d{10})?$/);
  expect(saved.language ?? "").not.toHaveLength(3);

  if ((await prisma.book.count()) > bookCountBefore) {
    await prisma.book.delete({ where: { id: saved.id } });
    console.log("Livre de test retiré de la base.");
  } else if ((await prisma.edition.count()) > editionCountBefore) {
    await prisma.edition.delete({ where: { id: saved.editionId } });
    console.log("Le livre existait déjà : seule l'édition de test est retirée.");
  } else {
    console.log("Le livre et l'édition existaient déjà : laissés en place.");
  }
  await prisma.$disconnect();
});
