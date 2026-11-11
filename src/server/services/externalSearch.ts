import { searchGoogleBooks } from "@/server/services/googleBooks";
import { emptySourcePage, excludeMangaSeries, mangaSeriesKey, mergeSourcePages } from "@/server/services/externalBooks";
import type { ExternalBookCandidate, ExternalBookSearchResult, ExternalBookSource } from "@/server/services/externalBooks";
import { searchOpenLibrary } from "@/server/services/openLibrary";

const MAX_EXTERNAL_RESULTS = 200;
// Quand une page revient presque vide après filtrage (mangas, volumes
// invalides, doublons, filtres de l'appelant), on redemande la suite aux
// sources plutôt que de renvoyer une page trouée. Plafonné pour ménager le
// quota Google.
const MAX_ROUNDS = 3;

type SearchExternalBooksInput = {
  query: string;
  mode: "all" | "title" | "author" | "isbn";
  language: string;
  source: "all" | ExternalBookSource;
  pageSize: number;
  // Un curseur par source : l'index brut où chacune reprend.
  googleStart: number;
  openLibraryStart: number;
  // Filtre de l'appelant, appliqué avant la pagination (pas de page trouée).
  keep?: (book: ExternalBookCandidate) => boolean;
  logLabel: string;
};

type SourceState = {
  name: ExternalBookSource;
  enabled: boolean;
  start: number;
  hasMore: boolean;
  totalItems: number;
  failed: boolean;
  search: (startIndex: number) => Promise<ExternalBookSearchResult>;
};

async function fetchSource(source: SourceState, query: string, logLabel: string) {
  if (!source.enabled || source.failed || !source.hasMore) {
    return emptySourcePage(source.start);
  }

  try {
    const page = await source.search(source.start);
    source.totalItems = page.totalItems;
    return page;
  } catch (error) {
    const { code, upstreamStatus } = error as { code?: string; upstreamStatus?: number };
    source.failed = true;
    console.error(
      `[${logLabel}] source ${source.name} en échec (${code ?? "ERREUR"}${upstreamStatus ? `, HTTP ${upstreamStatus}` : ""}) pour « ${query} » à l'index ${source.start}`,
      error instanceof Error ? error.message : error
    );
    return emptySourcePage(source.start);
  }
}

function applyKeep(page: ExternalBookSearchResult, keep: SearchExternalBooksInput["keep"]) {
  if (!keep) return page;
  const kept = page.items.map(keep);
  return {
    ...page,
    items: page.items.filter((_, index) => kept[index]),
    positions: page.positions.filter((_, index) => kept[index])
  };
}

// Interroge Google Books et Open Library, alterne leurs résultats et renvoie
// les curseurs de la page suivante. Lève une erreur 502 seulement si aucune
// source demandée ne répond ; une seule en panne donne `partial: true`.
export async function searchExternalBooks(input: SearchExternalBooksInput) {
  const { query, mode, language, source, pageSize, keep, logLabel } = input;
  const google: SourceState = {
    name: "google_books",
    enabled: source !== "open_library",
    start: source === "open_library" ? 0 : input.googleStart,
    hasMore: true,
    totalItems: 0,
    failed: false,
    search: (start) => searchGoogleBooks(query, start, { mode, language, pageSize })
  };
  const openLibrary: SourceState = {
    name: "open_library",
    enabled: source !== "google_books",
    start: source === "google_books" ? 0 : input.openLibraryStart,
    hasMore: true,
    totalItems: 0,
    failed: false,
    search: (start) => searchOpenLibrary(query, start, { mode, language, pageSize })
  };
  const sources = [google, openLibrary];
  const items: ExternalBookCandidate[] = [];
  const seen = new Set<string>();
  const mangaSeries = new Set<string>();
  let leftovers = false;

  for (let round = 0; round < MAX_ROUNDS && items.length < pageSize; round += 1) {
    const rawPages = await Promise.all(sources.map((state) => fetchSource(state, query, logLabel)));

    if (round === 0 && sources.every((state) => !state.enabled || state.failed)) {
      throw Object.assign(new Error("La recherche de livres est momentanément indisponible."), {
        status: 502,
        code: "BOOK_SEARCH_UNAVAILABLE"
      });
    }

    // Une série reconnue comme manga dans une source l'est pour les deux.
    rawPages.flatMap((page) => page.mangaTitles).forEach((title) => {
      const key = mangaSeriesKey(title);
      if (key) mangaSeries.add(key);
    });
    const [googlePage, openLibraryPage] = rawPages.map((page) => applyKeep(excludeMangaSeries(page, mangaSeries), keep));
    const merged = mergeSourcePages(googlePage, openLibraryPage, pageSize - items.length, seen);
    items.push(...merged.items);
    google.start = merged.firstStart;
    openLibrary.start = merged.secondStart;
    google.hasMore = google.enabled && !google.failed && (googlePage.hasMore || merged.firstStart < googlePage.nextStartIndex);
    openLibrary.hasMore = openLibrary.enabled && !openLibrary.failed && (openLibraryPage.hasMore || merged.secondStart < openLibraryPage.nextStartIndex);
    leftovers = merged.hasMore;

    if (!leftovers) break;
  }

  const consumed = google.start + openLibrary.start;
  const failedSources = sources.filter((state) => state.failed).map((state) => state.name);

  return {
    items,
    totalItems: Math.min(Math.max(google.totalItems + openLibrary.totalItems, items.length), MAX_EXTERNAL_RESULTS),
    // Curseurs à renvoyer tels quels pour la page suivante.
    googleStart: google.start,
    openLibraryStart: openLibrary.start,
    hasMore: leftovers && consumed < MAX_EXTERNAL_RESULTS,
    pageSize,
    // Une source en panne (quota Google, erreur réseau) : les résultats
    // viennent de l'autre seulement.
    partial: failedSources.length > 0,
    failedSources
  };
}
