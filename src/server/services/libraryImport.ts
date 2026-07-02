import { Prisma, ReadingStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 2000;

export type ImportRow = {
  index: number;
  title: string;
  authors: string[];
  isbn10: string[];
  isbn13: string[];
  status: ReadingStatus;
  rating: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  review: string | null;
};

export type ImportPreviewRow = ImportRow & {
  state: "new" | "match" | "conflict" | "invalid";
  bookId: string | null;
  message: string;
};

function parseCsvLine(line: string) {
  const fields: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      fields.push(value);
      value = "";
    } else value += char;
  }
  fields.push(value);
  return fields;
}

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""]));
  });
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function identifiers(value: string) {
  const normalized = value.replace(/[^0-9X]/gi, "").toUpperCase();
  return normalized.length === 10 ? { isbn10: [normalized], isbn13: [] } : normalized.length === 13 ? { isbn10: [], isbn13: [normalized] } : { isbn10: [], isbn13: [] };
}

function statusFrom(value: string, exclusiveShelf: string): ReadingStatus {
  const normalized = normalize(value || exclusiveShelf);
  if (["read", "lu", "finished"].includes(normalized)) return ReadingStatus.READ;
  if (["currently reading", "reading", "en cours"].includes(normalized)) return ReadingStatus.READING;
  if (["abandoned", "did not finish", "abandonne"].includes(normalized)) return ReadingStatus.ABANDONED;
  return ReadingStatus.TO_READ;
}

function isoDate(value: string) {
  if (!value) return null;
  const calendarDate = value.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (calendarDate) {
    return `${calendarDate[1]}-${calendarDate[2].padStart(2, "0")}-${calendarDate[3].padStart(2, "0")}`;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export function parseLibraryImport(text: string): ImportRow[] {
  const records = parseCsv(text);
  if (records.length > MAX_IMPORT_ROWS) throw Object.assign(new Error(`Le fichier dépasse ${MAX_IMPORT_ROWS} lignes.`), { status: 400 });
  return records.map((record, index) => {
    const goodreads = "Book Id" in record || "Exclusive Shelf" in record;
    const title = record.Title || record.title || "";
    const authorText = record.Author || record.authors || record.author || "";
    const isbnValue = (record.ISBN13 || record.isbn13 || record.ISBN || record.isbn10 || "").replace(/^="?|"?$/g, "");
    const isbn = identifiers(isbnValue);
    const ratingValue = Number(record["My Rating"] || record.rating || 0);
    return {
      index,
      title,
      authors: goodreads
        ? [authorText.trim()].filter(Boolean)
        : authorText.split(";").map((author) => author.trim()).filter(Boolean),
      ...isbn,
      status: statusFrom(record.status || "", goodreads ? record["Exclusive Shelf"] : ""),
      rating: ratingValue >= 1 && ratingValue <= 5 ? ratingValue : null,
      startedAt: isoDate(record["Date Started"] || record.startedAt || ""),
      finishedAt: isoDate(record["Date Read"] || record.finishedAt || ""),
      review: (record["My Review"] || record.review || "").trim() || null
    };
  });
}

export async function previewLibraryImport(userId: string, rows: ImportRow[]): Promise<ImportPreviewRow[]> {
  const books = await prisma.book.findMany();
  const userBooks = await prisma.userBook.findMany({
    where: { userId },
    include: { readingPeriods: true, book: true }
  });
  const reviews = await prisma.review.findMany({ where: { userId } });

  return rows.map((row) => {
    if (!row.title || !row.authors.length) return { ...row, state: "invalid", bookId: null, message: "Titre et auteur obligatoires." };
    const book = books.find((candidate) =>
      (row.isbn13.length && candidate.isbn13.some((isbn) => row.isbn13.includes(isbn)))
      || (row.isbn10.length && candidate.isbn10.some((isbn) => row.isbn10.includes(isbn)))
      || (normalize(candidate.title) === normalize(row.title) && normalize(candidate.authors[0] ?? "") === normalize(row.authors[0] ?? ""))
    );
    if (!book) return { ...row, state: "new", bookId: null, message: "Nouveau livre." };
    const userBook = userBooks.find((entry) => entry.bookId === book.id);
    const review = reviews.find((entry) => entry.bookId === book.id);
    const hasConflict = Boolean(userBook && userBook.status !== row.status)
      || Boolean(review && row.rating && review.rating !== row.rating)
      || Boolean(userBook?.readingPeriods.length && (row.startedAt || row.finishedAt));
    return {
      ...row,
      state: hasConflict ? "conflict" : "match",
      bookId: book.id,
      message: hasConflict ? "Des données existantes diffèrent." : userBook ? "Déjà présent, données compatibles." : "Livre reconnu."
    };
  });
}

type Resolution = Record<string, "keep" | "import">;

export async function commitLibraryImport(userId: string, preview: ImportPreviewRow[], resolutions: Resolution) {
  return prisma.$transaction(async (tx) => {
    const summary = { imported: 0, merged: 0, skipped: 0, errors: 0 };
    for (const row of preview) {
      if (row.state === "invalid") {
        summary.errors += 1;
        continue;
      }
      if (row.state === "conflict" && resolutions[String(row.index)] !== "import") {
        summary.skipped += 1;
        continue;
      }
      let bookId = row.bookId;
      if (!bookId) {
        const book = await tx.book.create({
          data: {
            title: row.title,
            authors: row.authors,
            isbn10: row.isbn10,
            isbn13: row.isbn13,
            source: "import"
          }
        });
        bookId = book.id;
      }
      const userBook = await tx.userBook.upsert({
        where: { userId_bookId: { userId, bookId } },
        update: row.state === "conflict" ? { status: row.status } : {},
        create: { userId, bookId, status: row.status }
      });
      if (row.startedAt || row.finishedAt) {
        const existingPeriod = await tx.readingPeriod.findFirst({ where: { userBookId: userBook.id }, orderBy: { createdAt: "desc" } });
        const dates = {
          startedAt: row.startedAt ? new Date(`${row.startedAt}T12:00:00.000Z`) : null,
          finishedAt: row.finishedAt ? new Date(`${row.finishedAt}T12:00:00.000Z`) : null
        };
        if (existingPeriod && row.state === "conflict") await tx.readingPeriod.update({ where: { id: existingPeriod.id }, data: dates });
        else if (!existingPeriod) await tx.readingPeriod.create({ data: { userBookId: userBook.id, ...dates } });
      }
      if (row.rating) {
        const existingReview = await tx.review.findUnique({ where: { userId_bookId: { userId, bookId } } });
        if (!existingReview) await tx.review.create({ data: { userId, bookId, rating: row.rating, body: row.review } });
        else if (row.state === "conflict") await tx.review.update({ where: { id: existingReview.id }, data: { rating: row.rating, body: row.review ?? existingReview.body } });
      }
      if (row.state === "new") summary.imported += 1;
      else summary.merged += 1;
    }
    return summary;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
