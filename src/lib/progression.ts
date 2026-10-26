// Barème d'XP, badges et étapes du parcours. Module pur : aucune dépendance serveur,
// il est partagé par les services, les pages et les tests.

export type XpReasonKey =
  | "BOOK_READ"
  | "REVIEW"
  | "JOURNAL_ENTRY"
  | "COMMENT"
  | "LIBRARY_ADD"
  | "FOLLOW"
  | "LIKE_REVIEW"
  | "LIKE_COMMENT";

type CapGroup = "journal" | "comments" | "library" | "follows" | "likes";

export const XP_RULES: Record<XpReasonKey, { amount: number; label: string; capGroup?: CapGroup }> = {
  BOOK_READ: { amount: 50, label: "Terminer un livre" },
  REVIEW: { amount: 20, label: "Écrire une review" },
  JOURNAL_ENTRY: { amount: 10, label: "Entrée de journal", capGroup: "journal" },
  COMMENT: { amount: 5, label: "Commenter une review", capGroup: "comments" },
  LIBRARY_ADD: { amount: 2, label: "Ajouter un livre à sa bibliothèque", capGroup: "library" },
  FOLLOW: { amount: 2, label: "Suivre un lecteur", capGroup: "follows" },
  LIKE_REVIEW: { amount: 1, label: "Liker une review", capGroup: "likes" },
  LIKE_COMMENT: { amount: 1, label: "Liker un commentaire", capGroup: "likes" }
};

// XP maximale par jour et par groupe ; au-delà, l'action est enregistrée à 0 XP mais compte pour les badges.
export const DAILY_XP_CAPS: Record<CapGroup, number> = {
  journal: 30,
  comments: 25,
  library: 10,
  follows: 10,
  likes: 20
};

export function reasonsInCapGroup(group: CapGroup) {
  return (Object.keys(XP_RULES) as XpReasonKey[]).filter((reason) => XP_RULES[reason].capGroup === group);
}

export function cappedAmount(reason: XpReasonKey, alreadyEarnedTodayInGroup: number) {
  const rule = XP_RULES[reason];
  if (!rule.capGroup) return rule.amount;
  const remaining = DAILY_XP_CAPS[rule.capGroup] - alreadyEarnedTodayInGroup;
  return Math.max(0, Math.min(rule.amount, remaining));
}

export const DEFAULT_DAILY_GOAL = 10;
export const DAILY_GOAL_OPTIONS = [
  { value: 10, label: "Tranquille", hint: "10 likes, ou une entrée de journal" },
  { value: 20, label: "Régulier", hint: "deux entrées de journal, ou une review" },
  { value: 30, label: "Assidu", hint: "une review et une entrée de journal" },
  { value: 50, label: "Intense", hint: "l'équivalent d'un livre terminé" }
] as const;
export const DAILY_GOAL_VALUES = DAILY_GOAL_OPTIONS.map((option) => option.value);

export const MAX_STREAK_FREEZES = 2;
export const FREEZE_EVERY_DAYS = 7;

export type BadgeMetric = "booksRead" | "reviews" | "likes" | "comments" | "journalEntries" | "streak" | "journeyDays";
export type BadgeIcon = "book" | "review" | "heart" | "comment" | "journal" | "flame" | "route";

export type BadgeDefinition = {
  slug: string;
  name: string;
  description: string;
  metric: BadgeMetric;
  unit: string;
  icon: BadgeIcon;
  tiers: number[];
};

export const BADGES: BadgeDefinition[] = [
  { slug: "lecteur", name: "Lecteur", description: "Terminer des livres.", metric: "booksRead", unit: "livres lus", icon: "book", tiers: [1, 10, 50, 100] },
  { slug: "critique", name: "Critique", description: "Publier des reviews.", metric: "reviews", unit: "reviews", icon: "review", tiers: [1, 10, 50] },
  { slug: "coeur-genereux", name: "Cœur généreux", description: "Liker des reviews et des commentaires.", metric: "likes", unit: "likes", icon: "heart", tiers: [10, 100, 500] },
  { slug: "bavard", name: "Bavard", description: "Commenter les reviews des autres lecteurs.", metric: "comments", unit: "commentaires", icon: "comment", tiers: [10, 50, 200] },
  { slug: "carnet-de-bord", name: "Carnet de bord", description: "Tenir son journal de lecture.", metric: "journalEntries", unit: "entrées", icon: "journal", tiers: [10, 50, 200] },
  { slug: "regulier", name: "Régulier", description: "Valider des jours d'affilée.", metric: "streak", unit: "jours de série", icon: "flame", tiers: [7, 30, 100, 365] },
  { slug: "grand-voyageur", name: "Grand voyageur", description: "Valider des jours sur son parcours.", metric: "journeyDays", unit: "jours validés", icon: "route", tiers: [10, 50, 100, 365] }
];

export const TIER_NAMES = ["Bronze", "Argent", "Or", "Platine"];

export function tierName(tier: number) {
  return TIER_NAMES[tier - 1] ?? `Palier ${tier}`;
}

export function badgeBySlug(slug: string) {
  return BADGES.find((badge) => badge.slug === slug);
}

// Paliers (numérotés à partir de 1) atteints pour une valeur donnée.
export function reachedTiers(badge: BadgeDefinition, value: number) {
  return badge.tiers.flatMap((threshold, index) => (value >= threshold ? [index + 1] : []));
}

export function nextTier(badge: BadgeDefinition, value: number) {
  const index = badge.tiers.findIndex((threshold) => value < threshold);
  return index === -1 ? null : { tier: index + 1, threshold: badge.tiers[index] };
}

const METRICS_BY_REASON: Record<XpReasonKey, BadgeMetric[]> = {
  BOOK_READ: ["booksRead"],
  REVIEW: ["reviews"],
  JOURNAL_ENTRY: ["journalEntries"],
  COMMENT: ["comments"],
  LIBRARY_ADD: [],
  FOLLOW: [],
  LIKE_REVIEW: ["likes"],
  LIKE_COMMENT: ["likes"]
};

export function metricsForReason(reason: XpReasonKey) {
  return METRICS_BY_REASON[reason];
}

export const JOURNEY_MILESTONES = [
  { day: 1, title: "Prologue", description: "Premier livre terminé, le parcours commence." },
  { day: 3, title: "Premier chapitre", description: "Trois jours validés." },
  { day: 7, title: "Une semaine", description: "Le rythme s'installe." },
  { day: 14, title: "Quinzaine", description: "Deux semaines de lecture." },
  { day: 30, title: "Un mois", description: "La lecture devient une habitude." },
  { day: 60, title: "Deux mois", description: "Lecteur confirmé." },
  { day: 100, title: "Centenaire", description: "Cent jours validés." },
  { day: 200, title: "Saga", description: "Deux cents jours de lecture." },
  { day: 365, title: "Une année", description: "Un an de parcours." }
];

// Jours calendaires au format AAAA-MM-JJ, calculés dans le fuseau de l'utilisateur.
export function localDay(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
    return true;
  } catch {
    return false;
  }
}

// Une colonne Postgres DATE est lue et écrite par Prisma à minuit UTC.
export function dayToDate(day: string) {
  return new Date(`${day}T00:00:00.000Z`);
}

export function dateToDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: string, amount: number) {
  const date = dayToDate(day);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateToDay(date);
}

export function daysBetween(from: string, to: string) {
  return Math.round((dayToDate(to).getTime() - dayToDate(from).getTime()) / 86_400_000);
}

export type StreakState = {
  currentStreak: number;
  longestStreak: number;
  lastValidatedDay: string | null;
  streakFreezes: number;
};

// Applique la validation du jour `today` : prolonge la série, consomme des gels pour
// combler les jours manqués si possible, sinon repart à 1. Un gel est gagné tous les 7 jours.
export function applyDayValidation(state: StreakState, today: string): StreakState & { frozenDays: string[] } {
  if (state.lastValidatedDay === today) return { ...state, frozenDays: [] };

  let currentStreak = 1;
  let streakFreezes = state.streakFreezes;
  const frozenDays: string[] = [];

  if (state.lastValidatedDay) {
    const missed = daysBetween(state.lastValidatedDay, today) - 1;
    if (missed === 0) {
      currentStreak = state.currentStreak + 1;
    } else if (missed > 0 && missed <= streakFreezes) {
      for (let offset = 1; offset <= missed; offset += 1) frozenDays.push(addDays(state.lastValidatedDay, offset));
      streakFreezes -= missed;
      currentStreak = state.currentStreak + missed + 1;
    }
  }

  if (currentStreak % FREEZE_EVERY_DAYS === 0) streakFreezes = Math.min(MAX_STREAK_FREEZES, streakFreezes + 1);

  return {
    currentStreak,
    longestStreak: Math.max(state.longestStreak, currentStreak),
    lastValidatedDay: today,
    streakFreezes,
    frozenDays
  };
}

// Série à afficher aujourd'hui, sans écrire en base : elle tombe à 0 dès que les jours
// manqués dépassent les gels disponibles.
export function displayedStreak(state: StreakState, today: string) {
  if (!state.lastValidatedDay) return { streak: 0, validatedToday: false, atRisk: false };
  if (state.lastValidatedDay === today) return { streak: state.currentStreak, validatedToday: true, atRisk: false };

  const missed = daysBetween(state.lastValidatedDay, today) - 1;
  if (missed <= state.streakFreezes) return { streak: state.currentStreak, validatedToday: false, atRisk: true };
  return { streak: 0, validatedToday: false, atRisk: false };
}
