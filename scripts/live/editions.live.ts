// Enregistre plusieurs éditions fictives d'un même livre par upsertExternalBook, sans appel réseau.
// ÉCRIT dans la base de DATABASE_URL (qui doit contenir au moins un compte), puis retire ce que ce test a créé.
import { expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { upsertExternalBook } from "@/server/services/books";
import { updateLibraryStatus } from "@/server/services/readingJournal";

const base = { authors: ["Zélie Testauteur"], pageCount: 300, publisher: "Éd. Test", genres: ["fantasy"], language: "fr" };

it("regroupe les éditions d'un même livre", async () => {
  const poche = await upsertExternalBook({ ...base, source: "google_books", googleBooksVolumeId: "tmpGoogle1", title: "Le Livre Témoin", isbn13: ["9780000000019"], isbn10: [] });
  // Même édition vue par Open Library (ISBN-10 équivalent) : même livre, même édition, identifiants cumulés.
  const same = await upsertExternalBook({ ...base, source: "open_library", openLibraryKey: "OL999999991M", openLibraryWorkKey: "OL999999991W", title: "Le livre temoin", isbn10: ["0000000019"], isbn13: [] });
  // Autre édition, reconnue par la clé d'œuvre malgré un titre différent.
  const broche = await upsertExternalBook({ ...base, source: "open_library", openLibraryKey: "OL999999992M", openLibraryWorkKey: "OL999999991W", title: "The Witness Book", pageCount: 512, isbn13: ["9780000000026"], isbn10: [] });
  // Troisième édition sans identifiant d'œuvre : reconnue par titre + premier auteur.
  const relie = await upsertExternalBook({ ...base, source: "google_books", googleBooksVolumeId: "tmpGoogle2", title: "LE LIVRE TÉMOIN", isbn13: ["9780000000033"], isbn10: [] });

  try {
    expect(same.id).toBe(poche.id);
    expect(same.editionId).toBe(poche.editionId);
    expect(broche.id).toBe(poche.id);
    expect(broche.editionId).not.toBe(poche.editionId);
    expect(relie.id).toBe(poche.id);

    const book = await prisma.book.findUniqueOrThrow({ where: { id: poche.id }, include: { editions: { orderBy: { createdAt: "asc" } }, bookAuthors: { include: { author: true } } } });
    expect(book.title).toBe("Le Livre Témoin");
    expect(book.pageCount).toBe(300);
    expect(book.openLibraryWorkKey).toBe("OL999999991W");
    expect(book.editions).toHaveLength(3);
    expect(book.editions[0]).toMatchObject({ googleBooksVolumeId: "tmpGoogle1", openLibraryKey: "OL999999991M", isbn13: "9780000000019" });
    expect(book.editions[1]).toMatchObject({ pageCount: 512, isbn13: "9780000000026" });
    expect(book.bookAuthors.map((link) => link.author.slug)).toEqual(["zelie-testauteur"]);

    const user = await prisma.user.findFirstOrThrow({ select: { id: true } });
    const first = await updateLibraryStatus(user.id, poche.id, "TO_READ", broche.editionId);
    expect(first.editionId).toBe(broche.editionId);
    const second = await updateLibraryStatus(user.id, poche.id, "READING", poche.editionId);
    expect(second.editionId).toBe(broche.editionId);
    await prisma.xpEvent.deleteMany({ where: { sourceId: poche.id } });
  } finally {
    await prisma.book.delete({ where: { id: poche.id } });
    await prisma.author.deleteMany({ where: { slug: "zelie-testauteur" } });
    await prisma.$disconnect();
  }
});
