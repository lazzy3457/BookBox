// Vérifications sur les vraies API. À lancer avec `npm run test:live`.
// Aucune écriture en base : la limite de débit (qui passe par Prisma) est neutralisée.
import { expect, it, vi } from "vitest";
import { GET } from "@/app/api/books/search/route";
import { searchGoogleBooks } from "@/server/services/googleBooks";
import { searchOpenLibrary } from "@/server/services/openLibrary";
import { excludeMangaSeries, mangaSeriesKey } from "@/server/services/externalBooks";
import type { ExternalBookCandidate, ExternalBookSearchResult } from "@/server/services/externalBooks";
import { externalBookUpsertSchema } from "@/server/validation/books";

vi.mock("@/server/security/rateLimit", () => ({
  enforceRateLimit: async () => undefined,
  getClientIdentifier: () => "live-check"
}));

const QUERIES = ["harry potter", "le trône de fer", "game of thrones", "naruto", "astérix", "l'étranger camus"];
const PAGE_SIZE = 20;

type SearchPayload = {
  items: ExternalBookCandidate[];
  googleStart: number;
  openLibraryStart: number;
  hasMore: boolean;
  partial: boolean;
  failedSources: string[];
};

async function searchPage(query: string, cursors = { googleStart: 0, openLibraryStart: 0 }) {
  const params = new URLSearchParams({
    q: query,
    pageSize: String(PAGE_SIZE),
    googleStart: String(cursors.googleStart),
    openLibraryStart: String(cursors.openLibraryStart)
  });
  const response = await GET(new Request(`http://localhost/api/books/search?${params}`));
  expect(response.status).toBe(200);
  return (await response.json()) as SearchPayload;
}

const key = (book: ExternalBookCandidate) => book.externalId ?? book.title;

// Tout ce qu'Open Library renvoie avant l'index `end`, par lots de 100.
async function openLibraryUpTo(query: string, end: number) {
  const all = await searchOpenLibrary(query, 0, { pageSize: 100 });
  while (all.nextStartIndex < end && all.hasMore) {
    const next = await searchOpenLibrary(query, all.nextStartIndex, { pageSize: 100 });
    all.items.push(...next.items);
    all.positions.push(...next.positions);
    all.mangaTitles.push(...next.mangaTitles);
    all.nextStartIndex = next.nextStartIndex;
    all.hasMore = next.hasMore;
  }
  return all;
}

it("mesure les résultats par source", async () => {
  const rows: Record<string, unknown>[] = [];
  for (const query of QUERIES) {
    const [google, openLibrary] = await Promise.allSettled([
      searchGoogleBooks(query, 0, { pageSize: PAGE_SIZE }),
      searchOpenLibrary(query, 0, { pageSize: PAGE_SIZE })
    ]);
    const olItems = openLibrary.status === "fulfilled" ? openLibrary.value.items : [];
    rows.push({
      requête: query,
      google: google.status === "fulfilled" ? google.value.items.length : `ERREUR ${(google.reason as Error).name}`,
      openLibrary: openLibrary.status === "fulfilled" ? olItems.length : "ERREUR",
      olEnregistrables: olItems.filter((book) => externalBookUpsertSchema.safeParse(book).success).length,
      olIsbnMax: Math.max(0, ...olItems.map((book) => (book.isbn10?.length ?? 0) + (book.isbn13?.length ?? 0))),
      olLangues: [...new Set(olItems.map((book) => book.language ?? "—"))].join(",")
    });
  }
  console.table(rows);
});

it("enchaîne les pages 1 et 2 sans trou ni doublon", async () => {
  const rows: Record<string, unknown>[] = [];
  for (const query of QUERIES) {
    const first = await searchPage(query);
    const second = first.hasMore ? await searchPage(query, first) : null;
    // Comme le front (loadMore) : un livre déjà affiché n'est pas ajouté deux fois.
    const firstKeys = new Set(first.items.map(key));
    const repeated = (second?.items ?? []).filter((book) => firstKeys.has(key(book)));
    const shown = [...first.items, ...(second?.items ?? []).filter((book) => !firstKeys.has(key(book)))];
    const keys = shown.map(key);

    // Pas de doublon à l'affichage, et aucun renvoyé par le serveur côté Open
    // Library. Google, lui, peut resservir un volume à un autre index.
    expect(new Set(keys).size).toBe(keys.length);
    expect(repeated.filter((book) => book.source === "open_library")).toEqual([]);

    // Pas de trou : pour chaque source, les livres affichés sont exactement le
    // début de ce que la source renvoie (après filtrage), dans le même ordre.
    const cursors = second ?? first;
    const reference = await Promise.all([
      cursors.googleStart ? searchGoogleBooks(query, 0, { pageSize: Math.min(cursors.googleStart, 40) }) : null,
      cursors.openLibraryStart ? openLibraryUpTo(query, cursors.openLibraryStart) : null
    ]);
    const series = new Set(reference.flatMap((page) => page?.mangaTitles ?? []).flatMap((title) => mangaSeriesKey(title) ?? []));
    const expectedKeys = (page: ExternalBookSearchResult, end: number) => {
      const filtered = excludeMangaSeries(page, series);
      return [...new Set(filtered.items.filter((_, index) => filtered.positions[index] < end).map(key))];
    };
    const [google, openLibrary] = reference;
    // Google : seule l'absence de doublon est vérifiable. L'API ne renvoie pas
    // les mêmes volumes à un index donné selon la taille de page demandée (ni
    // toujours d'un appel à l'autre) : l'écart avec un appel de référence est
    // affiché pour information, pas exigé nul.
    const googleShown = shown.filter((book) => book.source === "google_books").map(key);
    const googleDrift = google && cursors.googleStart <= 40
      ? googleShown.filter((id) => !expectedKeys(google, cursors.googleStart).includes(id)).length
      : "—";
    if (openLibrary && !cursors.failedSources.includes("open_library")) {
      expect(shown.filter((book) => book.source === "open_library").map(key)).toEqual(expectedKeys(openLibrary, cursors.openLibraryStart));
    }

    rows.push({
      requête: query,
      page1: first.items.length,
      page2: second?.items.length ?? "—",
      google: shown.filter((book) => book.source === "google_books").length,
      openLibrary: shown.filter((book) => book.source === "open_library").length,
      curseurs: `${cursors.googleStart}/${cursors.openLibraryStart}`,
      écartGoogle: googleDrift,
      doublonsGoogleRetirés: repeated.length,
      suite: cursors.hasMore,
      partiel: [...new Set([...first.failedSources, ...(second?.failedSources ?? [])])].join(",") || "non"
    });
  }
  console.table(rows);
});

it("signale une source en panne sans perdre l'autre", async () => {
  const realKey = process.env.GOOGLE_BOOKS_API_KEY;
  const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
  process.env.GOOGLE_BOOKS_API_KEY = "cle-invalide-pour-test";
  try {
    const payload = await searchPage("dune frank herbert");
    expect(payload.partial).toBe(true);
    expect(payload.failedSources).toEqual(["google_books"]);
    expect(payload.items.length).toBeGreaterThan(0);
    expect(errors).toHaveBeenCalled();
    console.log("Panne simulée →", { partial: payload.partial, failedSources: payload.failedSources, livres: payload.items.length, journal: errors.mock.calls[0]?.[0] });
  } finally {
    process.env.GOOGLE_BOOKS_API_KEY = realKey;
    errors.mockRestore();
  }
});

it("écarte les mangas et garde les BD", async () => {
  const naruto = await searchPage("naruto");
  const asterix = await searchPage("astérix");
  console.log("naruto →", naruto.items.map((book) => `${book.source === "google_books" ? "G" : "OL"} ${book.title} [${book.publisher ?? "?"}]`));
  console.log("astérix →", asterix.items.length, "livres dont", asterix.items.filter((book) => book.genres?.includes("bd-manga")).length, "classés BD");
  expect(asterix.items.length).toBe(PAGE_SIZE);
});
