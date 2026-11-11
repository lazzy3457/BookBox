import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  book: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  readingEntry: { findMany: vi.fn(), updateMany: vi.fn() }
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));

import { setBookPageCount } from "@/server/services/books";

describe("setBookPageCount", () => {
  beforeEach(() => {
    prismaMock.book.findUnique.mockReset();
    prismaMock.book.updateMany.mockReset();
    prismaMock.book.update.mockReset();
    prismaMock.readingEntry.findMany.mockReset();
    prismaMock.readingEntry.updateMany.mockReset();
  });

  it("renseigne un nombre de pages manquant", async () => {
    prismaMock.book.findUnique.mockResolvedValue({ pageCount: null, libraries: [{ id: "ub1" }] });
    prismaMock.book.updateMany.mockResolvedValue({ count: 1 });

    await expect(setBookPageCount({ userId: "u1", bookId: "b1", pageCount: 640, isAdmin: false })).resolves.toEqual({ id: "b1", pageCount: 640 });
    expect(prismaMock.book.updateMany).toHaveBeenCalledWith({ where: { id: "b1", pageCount: null }, data: { pageCount: 640 } });
  });

  it("ne remplace jamais un nombre de pages déjà connu", async () => {
    prismaMock.book.findUnique.mockResolvedValue({ pageCount: 320, libraries: [{ id: "ub1" }] });

    await expect(setBookPageCount({ userId: "u1", bookId: "b1", pageCount: 640, isAdmin: false })).rejects.toMatchObject({ status: 409, code: "PAGE_COUNT_ALREADY_SET" });
    expect(prismaMock.book.updateMany).not.toHaveBeenCalled();
  });

  it("refuse un livre absent de la bibliothèque du lecteur", async () => {
    prismaMock.book.findUnique.mockResolvedValue({ pageCount: null, libraries: [] });

    await expect(setBookPageCount({ userId: "u1", bookId: "b1", pageCount: 640, isAdmin: false })).rejects.toMatchObject({ status: 404, code: "BOOK_NOT_IN_LIBRARY" });
    expect(prismaMock.book.updateMany).not.toHaveBeenCalled();
  });

  it("laisse un admin corriger un nombre de pages et recalcule les progressions", async () => {
    prismaMock.book.findUnique.mockResolvedValue({ pageCount: 320, libraries: [] });
    prismaMock.readingEntry.findMany.mockResolvedValue([{ id: "e1", page: 160 }, { id: "e2", page: 160 }, { id: "e3", page: 900 }]);

    await expect(setBookPageCount({ userId: "admin", bookId: "b1", pageCount: 640, isAdmin: true })).resolves.toEqual({ id: "b1", pageCount: 640 });
    expect(prismaMock.book.update).toHaveBeenCalledWith({ where: { id: "b1" }, data: { pageCount: 640 } });
    expect(prismaMock.readingEntry.updateMany).toHaveBeenCalledWith({ where: { id: { in: ["e1", "e2"] } }, data: { percentage: 25 } });
    expect(prismaMock.readingEntry.updateMany).toHaveBeenCalledWith({ where: { id: { in: ["e3"] } }, data: { percentage: 100 } });
  });
});
