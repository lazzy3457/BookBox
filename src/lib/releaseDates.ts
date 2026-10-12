// Dates de parution du calendrier. Google Books et Open Library renvoient
// "2026", "2026-10" ou "2026-10-15" : seules les dates au mois ou au jour
// sont assez précises pour être placées dans le calendrier.

export type ReleaseDate = {
  iso: string;
  year: number;
  month: number;
  day: number | null;
};

const MONTHS_SHORT = ["JAN", "FÉV", "MAR", "AVR", "MAI", "JUIN", "JUIL", "AOÛT", "SEPT", "OCT", "NOV", "DÉC"];
const MONTHS_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function parseReleaseDate(value: string | null | undefined): ReleaseDate | null {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(value?.trim() ?? "");
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = match[3] ? Number(match[3]) : null;

  if (month < 1 || month > 12) return null;
  if (day !== null && (day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate())) return null;

  const iso = `${match[1]}-${match[2]}${day !== null ? `-${match[3]}` : ""}`;
  return { iso, year, month, day };
}

const MONTH_NAMES: Array<[RegExp, number]> = [
  [/^(jan|janv|janvier|january)$/, 1],
  [/^(feb|fev|fevr|fevrier|february)$/, 2],
  [/^(mar|mars|march)$/, 3],
  [/^(apr|avr|avril|april)$/, 4],
  [/^(may|mai)$/, 5],
  [/^(jun|juin|june)$/, 6],
  [/^(jul|juil|juillet|july)$/, 7],
  [/^(aug|aout|august)$/, 8],
  [/^(sep|sept|septembre|september)$/, 9],
  [/^(oct|octobre|october)$/, 10],
  [/^(nov|novembre|november)$/, 11],
  [/^(dec|decembre|december)$/, 12]
];

function monthFromName(value: string) {
  const name = value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\.$/, "");
  return MONTH_NAMES.find(([pattern]) => pattern.test(name))?.[1] ?? null;
}

// Open Library mélange "2026-02-17", "February 17, 2026", "16th June 2026",
// "12 janvier 2026" ou "Janvier 2026". Les formats numériques ambigus
// ("10/04/2026") sont ignorés. Renvoie une date ISO au jour ou au mois.
export function normalizeLooseDate(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  const strict = parseReleaseDate(text);
  if (strict) return strict.iso;

  const pad = (number: number) => String(number).padStart(2, "0");
  const build = (year: string, month: number | null, day?: string) =>
    month ? parseReleaseDate(`${year}-${pad(month)}${day ? `-${pad(Number(day))}` : ""}`)?.iso ?? null : null;

  const monthFirst = /^([a-zéû.]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i.exec(text);
  if (monthFirst) return build(monthFirst[3], monthFromName(monthFirst[1]), monthFirst[2]);

  const dayFirst = /^(\d{1,2})(?:st|nd|rd|th|er)?\s+([a-zéû.]+)\s+(\d{4})$/i.exec(text);
  if (dayFirst) return build(dayFirst[3], monthFromName(dayFirst[2]), dayFirst[1]);

  const monthOnly = /^([a-zéû.]+)\s+(\d{4})$/i.exec(text);
  if (monthOnly) return build(monthOnly[2], monthFromName(monthOnly[1]));

  return null;
}

// Une date au mois seul est considérée comme le premier jour du mois.
export function releaseDateValue(date: ReleaseDate) {
  return Date.UTC(date.year, date.month - 1, date.day ?? 1);
}

export function shortMonthLabel(month: number) {
  return MONTHS_SHORT[month - 1] ?? "";
}

export function monthHeading(year: number, month: number) {
  const label = MONTHS_LONG[month - 1] ?? "";
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${year}`;
}

export function toIsoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

// Un livre daté au mois courant sans jour précis n'est pas encore « sorti ».
export function isReleased(date: ReleaseDate, todayIso: string) {
  return date.day === null ? date.iso < todayIso.slice(0, 7) : date.iso <= todayIso;
}
