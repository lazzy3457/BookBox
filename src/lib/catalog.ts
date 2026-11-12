// Règles de rapprochement du catalogue (module pur, partagé avec scripts/backfill-catalog.mjs).

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Deux éditions sans identifiant commun appartiennent au même livre quand leur
// titre et leur premier auteur sont identiques une fois normalisés. Sans
// auteur, le titre seul ne suffit pas : pas de clé.
export function bookMatchKey(title: string, authors: readonly string[]) {
  const titleKey = normalizeText(title);
  const authorKey = normalizeText(authors[0] ?? "");
  return titleKey && authorKey ? `${titleKey}|${authorKey}` : null;
}

function cleanIsbn(value: string) {
  return value.replace(/[^0-9X]/gi, "").toUpperCase();
}

// Forme unique d'un ISBN : 13 chiffres. Un ISBN-10 reçoit le préfixe 978 et
// une clé de contrôle recalculée ; une valeur mal formée donne null.
export function toIsbn13(value: string) {
  const isbn = cleanIsbn(value);
  if (/^97[89]\d{10}$/.test(isbn)) return isbn;
  if (!/^\d{9}[\dX]$/.test(isbn)) return null;

  const core = `978${isbn.slice(0, 9)}`;
  const sum = [...core].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
  return `${core}${(10 - (sum % 10)) % 10}`;
}

// ISBN-13 d'un candidat, les ISBN-13 d'origine avant les ISBN-10 convertis.
export function candidateIsbns(isbn13: readonly string[] | undefined, isbn10: readonly string[] | undefined) {
  const values = [...(isbn13 ?? []), ...(isbn10 ?? [])].flatMap((value) => toIsbn13(value) ?? []);
  return [...new Set(values)];
}

// Open Library désigne une édition par « OL…M » et une œuvre par « OL…W »
// (parfois préfixée par « /works/ »).
export function openLibraryKeys(key: string | undefined | null, workKey?: string | null) {
  const clean = (value: string | undefined | null) => value?.trim().replace(/^\/(works|books)\//, "") ?? "";
  const first = clean(key);
  const work = clean(workKey);
  return {
    editionKey: /^OL\d+M$/.test(first) ? first : undefined,
    workKey: /^OL\d+W$/.test(work) ? work : /^OL\d+W$/.test(first) ? first : undefined
  };
}
