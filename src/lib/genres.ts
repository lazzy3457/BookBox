// Genres principaux de BooksBox. Les catégories Google Books et les sujets
// Open Library sont ramenés à cette liste fermée pour rester lisibles en badges.
// Ce module ne doit rien importer : il est aussi chargé par scripts/backfill-genres.mjs.

export const GENRES = [
  { slug: "fantasy", label: "Fantasy" },
  { slug: "science-fiction", label: "Science-fiction" },
  { slug: "romance", label: "Romance" },
  { slug: "thriller", label: "Thriller" },
  { slug: "policier", label: "Policier" },
  { slug: "horreur", label: "Horreur" },
  { slug: "aventure", label: "Aventure" },
  { slug: "historique", label: "Roman historique" },
  { slug: "litterature", label: "Littérature" },
  { slug: "classique", label: "Classique" },
  { slug: "jeunesse", label: "Jeunesse" },
  { slug: "young-adult", label: "Young adult" },
  { slug: "bd-manga", label: "BD & manga" },
  { slug: "poesie", label: "Poésie" },
  { slug: "theatre", label: "Théâtre" },
  { slug: "biographie", label: "Biographie" },
  { slug: "histoire", label: "Histoire" },
  { slug: "philosophie", label: "Philosophie" },
  { slug: "sciences", label: "Sciences" },
  { slug: "developpement-personnel", label: "Développement personnel" }
] as const;

export type GenreSlug = (typeof GENRES)[number]["slug"];

export const GENRE_SLUGS = GENRES.map((genre) => genre.slug) as [GenreSlug, ...GenreSlug[]];

export const MAX_BOOK_GENRES = 3;

const genreLabels = new Map<string, string>(GENRES.map((genre) => [genre.slug, genre.label]));

// Motifs appliqués sur un texte en minuscules et sans accents.
const genrePatterns: Array<[GenreSlug, RegExp]> = [
  ["fantasy", /\bfantasy\b|\bfantastique\b|\bsword and sorcery\b|\bdragons?\b|\bmagie\b/],
  ["science-fiction", /\bscience[ -]?fiction\b|\bsci-?fi\b|\bspace opera\b|\bdystopi|\bcyberpunk\b|\bsf\b/],
  ["romance", /\bromance\b(?! literature| frances)|\blove stories\b|\bcourtship\b|\bromans? d'amour\b|\bsentimental|\bromantic\b/],
  ["thriller", /\bthrillers?\b|\bsuspense\b/],
  ["policier", /\bmyster(y|ies)\b|\bdetective\b|\bcrime\b|\bpolicier\b|\bpolar\b|\broman noir\b/],
  ["horreur", /\bhorror\b|\bhorreur\b|\bepouvante\b|\bghost stories\b/],
  ["aventure", /\badventure\b|\baventures?\b/],
  ["historique", /\bhistorical fiction\b|\bfiction \/ historical\b|\broman historique\b|\bromans historiques\b/],
  ["litterature", /\bliterary\b|\blitterature\b/],
  ["classique", /\bclassics?\b|\bclassiques?\b/],
  ["jeunesse", /\bjuvenile\b|\bchildren\b|\bjeunesse\b|\benfants?\b/],
  ["young-adult", /\byoung adult\b/],
  ["bd-manga", /\bcomics?\b|\bgraphic novels?\b|\bmanga\b|\bbandes? dessinees?\b/],
  ["poesie", /\bpoetry\b|\bpoesie\b|\bpoems\b/],
  ["theatre", /^drama\b|\btheatre\b|^plays\b/],
  ["biographie", /\bbiograph|\bautobiograph|\bmemoirs?\b|\bmemoires\b/],
  ["histoire", /\bhistory\b(?! and criticism)|\bhistoire\b|\bhistoria\b/],
  ["philosophie", /\bphilosoph/],
  ["sciences", /^science\b(?![ -]?fiction)|^sciences\b|\bmathemati|\bphysique\b|\bphysics\b/],
  ["developpement-personnel", /\bself-help\b|\bdeveloppement personnel\b|\bpersonal growth\b/]
];

// Genres documentaires écartés lorsque le livre est classé comme fiction
// (Open Library ajoute souvent "History" ou "Military history" à des romans).
const nonFictionGenres = new Set<GenreSlug>(["histoire", "sciences", "philosophie", "biographie", "developpement-personnel"]);

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, "and").trim();
}

export function isGenreSlug(value: string): value is GenreSlug {
  return genreLabels.has(value);
}

export function genreLabel(slug: string) {
  return genreLabels.get(slug) ?? slug;
}

// Classe les genres par nombre de catégories correspondantes, puis par ordre
// d'apparition. Un genre doit totaliser au moins la moitié des correspondances
// du genre dominant, ce qui écarte les sujets anecdotiques d'Open Library.
export function genresFromCategories(categories: readonly string[] | undefined, limit = MAX_BOOK_GENRES): GenreSlug[] {
  const scores = new Map<GenreSlug, { count: number; firstIndex: number }>();
  const texts = (categories ?? []).map(normalize);
  const isFiction = texts.some((text) => /^fiction\b/.test(text));

  texts.forEach((text, index) => {
    for (const [slug, pattern] of genrePatterns) {
      if (isFiction && nonFictionGenres.has(slug)) continue;
      if (!pattern.test(text)) continue;
      const score = scores.get(slug);
      if (score) score.count += 1;
      else scores.set(slug, { count: 1, firstIndex: index });
    }
  });

  const ranked = [...scores.entries()].sort(([, a], [, b]) => b.count - a.count || a.firstIndex - b.firstIndex);
  const topCount = ranked[0]?.[1].count ?? 0;

  return ranked
    .filter(([, score]) => score.count * 2 >= topCount)
    .slice(0, limit)
    .map(([slug]) => slug);
}

// Retire les doublons et les valeurs inconnues, puis respecte l'ordre de GENRES.
export function normalizeGenres(values: readonly string[] | undefined, limit = MAX_BOOK_GENRES): GenreSlug[] {
  const unique = new Set((values ?? []).filter(isGenreSlug));
  return GENRE_SLUGS.filter((slug) => unique.has(slug)).slice(0, limit);
}
