// Avis par chapitre : un avis porte chapter = 0 (livre entier) ou le numéro du chapitre.
export const WHOLE_BOOK = 0;
export const MAX_CHAPTER = 999;

export function chaptersHref(bookId: string) {
  return `/books/${bookId}/chapitres`;
}

export function chapterHref(bookId: string, chapter: number) {
  return `/books/${bookId}/chapitres/${chapter}`;
}

/** Lien vers la page où un avis s'affiche : la fiche du livre, ou la page de son chapitre. */
export function reviewHref(review: { bookId: string; chapter: number }) {
  return review.chapter > WHOLE_BOOK ? chapterHref(review.bookId, review.chapter) : `/books/${review.bookId}`;
}

/** Lit un numéro de chapitre dans une URL ; null si ce n'est pas un entier entre 1 et MAX_CHAPTER. */
export function parseChapter(value: string) {
  if (!/^\d{1,3}$/.test(value)) return null;
  const chapter = Number(value);
  return chapter >= 1 && chapter <= MAX_CHAPTER ? chapter : null;
}

/** Un chapitre est ouvert au lecteur qui a fini le livre ou qui a déclaré l'avoir atteint. */
export function isChapterUnlocked(chapter: number, reader: { finished: boolean; chapter: number }) {
  return reader.finished || chapter <= reader.chapter;
}
