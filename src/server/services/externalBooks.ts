export type ExternalBookSource = "google_books" | "open_library";

export type ExternalBookCandidate = {
  externalId?: string;
  source?: ExternalBookSource;
  googleBooksVolumeId?: string;
  openLibraryKey?: string;
  isbn10?: string[];
  isbn13?: string[];
  title: string;
  authors: string[];
  description?: string;
  thumbnailUrl?: string;
  publishedDate?: string;
  publisher?: string;
  pageCount?: number;
  language?: string;
  genres?: string[];
};

// Une page de résultats d'une seule source. `positions[i]` est l'index brut
// (dans la source) de `items[i]` : comme des livres sont écartés en route
// (invalides, mangas), c'est lui qui permet de reprendre exactement après le
// dernier livre affiché.
export type ExternalBookSearchResult = {
  items: ExternalBookCandidate[];
  positions: number[];
  // Titres des livres écartés comme mangas : voir excludeMangaSeries.
  mangaTitles: string[];
  totalItems: number;
  nextStartIndex: number;
  hasMore: boolean;
};

export const EXTERNAL_BOOK_LIMITS = {
  title: 180,
  publisher: 180,
  author: 120,
  authors: 20,
  description: 10_000,
  publishedDate: 32,
  language: 16,
  isbns: 20
} as const;

// Un ISBN-10 et un ISBN-13 par édition, avec une marge pour les réimpressions.
// Au-delà, la liste mélange plusieurs éditions et ne doit pas servir de clé.
export const MAX_EDITION_ISBNS = 2;

const ISBN_PATTERN = /^[0-9X-]{10,20}$/i;

function cut(value: string | undefined | null, max: number) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max).trim() : undefined;
}

function webUrl(value: string | undefined) {
  if (!value || value.length > 2000) return undefined;
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}

export function cleanIsbns(values: readonly unknown[] | undefined, max: number = EXTERNAL_BOOK_LIMITS.isbns) {
  const cleaned = (values ?? [])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => ISBN_PATTERN.test(value));
  return [...new Set(cleaned)].slice(0, max);
}

const LANGUAGE_CODES: Record<string, string> = {
  fre: "fr", fra: "fr", eng: "en", spa: "es", ita: "it", ger: "de", deu: "de",
  por: "pt", dut: "nl", nld: "nl", jpn: "ja", chi: "zh", zho: "zh", rus: "ru",
  pol: "pl", swe: "sv", dan: "da", nor: "no", fin: "fi", tur: "tr", ara: "ar",
  cat: "ca", gre: "el", ell: "el", kor: "ko", lat: "la", cze: "cs", ces: "cs",
  hun: "hu", rum: "ro", ron: "ro", heb: "he", ukr: "uk", vie: "vi"
};

// Open Library donne des codes MARC sur 3 lettres ("fre"), Google des codes
// sur 2 lettres ("fr", parfois "fr-FR") : on ne garde que la forme courte.
export function normalizeLanguageCode(value: string | undefined | null) {
  // « pt-BR » → « pt » : la variante régionale ne sert pas à l'affichage.
  const code = value?.trim().toLowerCase().split(/[-_]/)[0];
  if (!code) return undefined;
  if (LANGUAGE_CODES[code]) return LANGUAGE_CODES[code];
  return code.slice(0, EXTERNAL_BOOK_LIMITS.language);
}

// Ramène un livre externe dans les limites des schémas de validation en
// coupant ce qui dépasse, au lieu de laisser un champ trop long faire rejeter
// le livre (ou toute la page de résultats).
export function sanitizeExternalBook<T extends ExternalBookCandidate>(book: T): T {
  const pageCount = typeof book.pageCount === "number" && Number.isFinite(book.pageCount) && book.pageCount > 0
    ? Math.round(book.pageCount)
    : undefined;

  return {
    ...book,
    title: cut(book.title, EXTERNAL_BOOK_LIMITS.title) ?? "",
    authors: [...new Set((book.authors ?? []).flatMap((author) => cut(author, EXTERNAL_BOOK_LIMITS.author) ?? []))]
      .slice(0, EXTERNAL_BOOK_LIMITS.authors),
    description: cut(book.description, EXTERNAL_BOOK_LIMITS.description),
    thumbnailUrl: webUrl(book.thumbnailUrl),
    publishedDate: cut(book.publishedDate, EXTERNAL_BOOK_LIMITS.publishedDate),
    publisher: cut(book.publisher, EXTERNAL_BOOK_LIMITS.publisher),
    pageCount,
    language: normalizeLanguageCode(book.language),
    isbn10: cleanIsbns(book.isbn10),
    isbn13: cleanIsbns(book.isbn13)
  };
}

function fold(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const MANGA_WORD = /\bmangas?\b/;
const COMICS_CATEGORY = /\bcomics?\b|\bgraphic novels?\b|\bbandes? dessinees?\b/;
// Éditeurs dont le catalogue BD est du manga. Les éditeurs mixtes (Glénat,
// Delcourt, Panini…) n'y sont pas : seules leurs collections nommées
// « … Manga » sont reconnues, par le mot lui-même.
const MANGA_PUBLISHER = /^(kana|viz media|vizmedia|pika|ki-oon|kurokawa|kodansha|shueisha|shogakukan|tonkam|kaze|taifu|doki-doki|akata|yen press|seven seas|tokyopop|square enix|mangetsu|ototo|nobi nobi|meian|crunchyroll|vega-dupuis|noeve|naban|komikku|imho|isan manga|chattochatto)\b/;

export type MangaSignals = {
  // Catégories Google Books ou sujets Open Library, tels que reçus.
  categories?: readonly string[];
  publisher?: string;
};

// Vrai pour un manga, faux pour une BD ou un comics occidental.
// Google ne renvoie le plus souvent que « Comics & Graphic Novels » dans une
// liste de résultats (le « / Manga / … » n'apparaît que sur la fiche du
// volume) : l'éditeur sert alors de second indice.
export function isManga({ categories, publisher }: MangaSignals) {
  const folded = (categories ?? []).map(fold);
  if (folded.some((category) => MANGA_WORD.test(category))) return true;

  const foldedPublisher = publisher ? fold(publisher).trim() : "";
  if (!foldedPublisher) return false;
  if (MANGA_WORD.test(foldedPublisher)) return true;

  // Éditeur de mangas : manga si le livre est classé BD, ou pas classé du tout.
  return MANGA_PUBLISHER.test(foldedPublisher) && (!folded.length || folded.some((category) => COMICS_CATEGORY.test(category)));
}

// « Naruto, Vol. 25 », « Naruto t.33 », « NARUTO -ナルト- 巻ノ十 » → « naruto ».
export function mangaSeriesKey(title: string) {
  const words = fold(title).replace(/[^a-z0-9]+/g, " ").trim();
  const key = words.split(/\b(?:tome|vol|volume|t|no|n|band|cilt|\d+)\b/)[0].trim();
  return key.length >= 4 ? key : null;
}

// Second filet, pour les mangas que ni les catégories ni l'éditeur ne
// trahissent (Google : « Comics & Graphic Novels » chez un éditeur mixte).
// Quand la même recherche a déjà identifié une série comme manga, les autres
// BD dont le titre commence par le nom de cette série sont écartées aussi.
// Les positions sont conservées : la pagination reste sans trou.
export function excludeMangaSeries<T extends Pick<SourcePage, "items" | "positions">>(page: T, seriesKeys: ReadonlySet<string>): T {
  if (!seriesKeys.size) return page;

  const keep = page.items.map((book) => {
    if (!book.genres?.includes("bd-manga")) return true;
    const title = fold(book.title).replace(/[^a-z0-9]+/g, " ").trim();
    return ![...seriesKeys].some((key) => title === key || title.startsWith(key + " "));
  });

  return {
    ...page,
    items: page.items.filter((_, index) => keep[index]),
    positions: page.positions.filter((_, index) => keep[index])
  };
}

function editionSignature(book: ExternalBookCandidate) {
  return [
    book.source,
    book.googleBooksVolumeId,
    book.openLibraryKey,
    book.title.toLowerCase(),
    book.authors.join(",").toLowerCase(),
    book.publisher?.toLowerCase(),
    book.publishedDate,
    book.pageCount,
    book.language
  ]
    .filter(Boolean)
    .join("|");
}

export function dedupeExternalBooks(items: ExternalBookCandidate[]) {
  const seen = new Set<string>();

  return items.filter((book) => {
    const signature = editionSignature(book);

    if (seen.has(signature)) {
      return false;
    }

    seen.add(signature);
    return true;
  });
}

export type SourcePage = Pick<ExternalBookSearchResult, "items" | "positions" | "nextStartIndex" | "hasMore">;

export function emptySourcePage(startIndex: number): ExternalBookSearchResult {
  return { items: [], positions: [], mangaTitles: [], totalItems: 0, nextStartIndex: startIndex, hasMore: false };
}

// Alterne les deux sources jusqu'à `limit` livres et renvoie, pour chacune,
// l'index brut où reprendre : juste après le dernier livre réellement pris.
// Les livres non affichés restent donc pour la page suivante (pas de trou),
// et un livre déjà vu (`seen`) est consommé sans être répété (pas de doublon).
export function mergeSourcePages(first: SourcePage, second: SourcePage, limit: number, seen = new Set<string>()) {
  const pages = [first, second];
  const taken = [0, 0];
  const items: ExternalBookCandidate[] = [];
  let turn = 0;

  while (items.length < limit && (taken[0] < first.items.length || taken[1] < second.items.length)) {
    const index = taken[turn] < pages[turn].items.length ? turn : 1 - turn;
    const book = pages[index].items[taken[index]];
    const signature = editionSignature(book);
    taken[index] += 1;
    turn = 1 - index;

    if (!seen.has(signature)) {
      seen.add(signature);
      items.push(book);
    }
  }

  const cursors = pages.map((page, index) => (
    taken[index] < page.items.length ? page.positions[taken[index]] : page.nextStartIndex
  ));
  const leftovers = pages.some((page, index) => taken[index] < page.items.length);

  return {
    items,
    firstStart: cursors[0],
    secondStart: cursors[1],
    hasMore: leftovers || first.hasMore || second.hasMore
  };
}
