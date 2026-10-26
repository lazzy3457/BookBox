import { Prisma, ReactionKind, ReadingStatus, type UserStats, type XpReason } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { badRequest, notFound } from "@/server/http/errors";
import { notifyBadgeEarned } from "@/server/services/notifications";
import {
  BADGES,
  JOURNEY_MILESTONES,
  XP_RULES,
  applyDayValidation,
  cappedAmount,
  dateToDay,
  dayToDate,
  displayedStreak,
  localDay,
  metricsForReason,
  nextTier,
  reachedTiers,
  reasonsInCapGroup,
  tierName,
  type BadgeMetric
} from "@/lib/progression";

export type ProgressResult = {
  xpGained: number;
  dayValidated: boolean;
  badgesEarned: Array<{ slug: string; name: string; tier: number; tierName: string }>;
};

export async function getOrCreateStats(userId: string) {
  return prisma.userStats.upsert({ where: { userId }, update: {}, create: { userId } });
}

function streakState(stats: UserStats) {
  return {
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    lastValidatedDay: stats.lastValidatedDay ? dateToDay(stats.lastValidatedDay) : null,
    streakFreezes: stats.streakFreezes
  };
}

// Valide le jour si l'objectif est atteint. `updateMany` sur `validatedAt: null` garantit
// qu'une seule requête concurrente fait avancer la série.
async function validateDayIfGoalReached(userId: string, day: string) {
  const stats = await prisma.userStats.findUniqueOrThrow({ where: { userId } });
  if (!stats.journeyStartedAt) return false;

  const claimed = await prisma.activityDay.updateMany({
    where: { userId, day: dayToDate(day), validatedAt: null, xp: { gte: stats.dailyGoal } },
    data: { validatedAt: new Date() }
  });
  if (claimed.count === 0) return false;

  const next = applyDayValidation(streakState(stats), day);
  await prisma.$transaction([
    prisma.activityDay.createMany({
      data: next.frozenDays.map((frozenDay) => ({ userId, day: dayToDate(frozenDay), frozen: true, validatedAt: new Date() })),
      skipDuplicates: true
    }),
    ...next.frozenDays.map((frozenDay) =>
      prisma.activityDay.updateMany({
        where: { userId, day: dayToDate(frozenDay), validatedAt: null },
        data: { frozen: true, validatedAt: new Date() }
      })
    ),
    prisma.userStats.update({
      where: { userId },
      data: {
        currentStreak: next.currentStreak,
        longestStreak: next.longestStreak,
        lastValidatedDay: next.lastValidatedDay ? dayToDate(next.lastValidatedDay) : null,
        streakFreezes: next.streakFreezes
      }
    })
  ]);
  return true;
}

async function metricValue(userId: string, metric: BadgeMetric) {
  switch (metric) {
    case "booksRead":
      return prisma.userBook.count({ where: { userId, status: ReadingStatus.READ } });
    case "reviews":
      return prisma.review.count({ where: { userId } });
    case "likes": {
      const [reviewLikes, commentLikes] = await Promise.all([
        prisma.reviewReaction.count({ where: { userId, kind: ReactionKind.LIKE } }),
        prisma.reviewCommentReaction.count({ where: { userId } })
      ]);
      return reviewLikes + commentLikes;
    }
    case "comments":
      return prisma.reviewComment.count({ where: { userId } });
    case "journalEntries":
      return prisma.readingEntry.count({ where: { period: { userBook: { userId } } } });
    case "streak":
      return (await prisma.userStats.findUnique({ where: { userId }, select: { longestStreak: true } }))?.longestStreak ?? 0;
    case "journeyDays":
      return prisma.activityDay.count({ where: { userId, validatedAt: { not: null } } });
  }
}

// Attribue les paliers atteints pour les métriques données. Les badges se basent sur les
// données réelles (bibliothèque, reviews, likes…), donc l'historique et les imports comptent.
async function awardBadges(userId: string, metrics: BadgeMetric[], options: { notify: boolean }) {
  const badges = BADGES.filter((badge) => metrics.includes(badge.metric));
  if (!badges.length) return [];

  const [values, owned] = await Promise.all([
    Promise.all(badges.map((badge) => metricValue(userId, badge.metric))),
    prisma.userBadge.findMany({ where: { userId, badgeSlug: { in: badges.map((badge) => badge.slug) } }, select: { badgeSlug: true, tier: true } })
  ]);
  const ownedKeys = new Set(owned.map((badge) => `${badge.badgeSlug}:${badge.tier}`));
  const earned = badges.flatMap((badge, index) =>
    reachedTiers(badge, values[index])
      .filter((tier) => !ownedKeys.has(`${badge.slug}:${tier}`))
      .map((tier) => ({ slug: badge.slug, name: badge.name, tier, tierName: tierName(tier) }))
  );
  if (!earned.length) return [];

  await prisma.userBadge.createMany({
    data: earned.map((badge) => ({ userId, badgeSlug: badge.slug, tier: badge.tier })),
    skipDuplicates: true
  });
  if (options.notify) {
    for (const badge of earned) await notifyBadgeEarned({ userId, badgeName: badge.name, tierName: badge.tierName });
  }
  return earned;
}

export async function syncBadges(userId: string) {
  return awardBadges(userId, BADGES.map((badge) => badge.metric), { notify: false });
}

// Enregistre une action après sa mutation. Ne lève jamais : la progression ne doit pas
// faire échouer l'action principale.
export async function recordProgress(userId: string, reason: XpReason, sourceId: string): Promise<ProgressResult | null> {
  try {
    const stats = await getOrCreateStats(userId);
    const today = localDay(new Date(), stats.timezone);
    const capGroup = XP_RULES[reason].capGroup;
    const earnedInGroup = capGroup
      ? (await prisma.xpEvent.aggregate({
          where: { userId, day: dayToDate(today), reason: { in: reasonsInCapGroup(capGroup) } },
          _sum: { amount: true }
        }))._sum.amount ?? 0
      : 0;
    const amount = cappedAmount(reason, earnedInGroup);

    try {
      await prisma.xpEvent.create({ data: { userId, reason, sourceId, amount, day: dayToDate(today) } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return null;
      throw error;
    }

    const startsJourney = reason === "BOOK_READ" && !stats.journeyStartedAt;
    await prisma.$transaction([
      prisma.userStats.update({
        where: { userId },
        data: { xpTotal: { increment: amount }, ...(startsJourney ? { journeyStartedAt: new Date() } : {}) }
      }),
      prisma.activityDay.upsert({
        where: { userId_day: { userId, day: dayToDate(today) } },
        update: { xp: { increment: amount } },
        create: { userId, day: dayToDate(today), xp: amount }
      })
    ]);

    const dayValidated = await validateDayIfGoalReached(userId, today);
    const metrics = [...metricsForReason(reason), ...(dayValidated ? (["streak", "journeyDays"] as const) : [])];
    const badgesEarned = await awardBadges(userId, metrics, { notify: true });
    return { xpGained: amount, dayValidated, badgesEarned };
  } catch (error) {
    console.warn("[progression] Impossible d'enregistrer la progression.", { reason, error: error instanceof Error ? error.message : error });
    return null;
  }
}

// Démarrage manuel pour les lecteurs qui avaient déjà terminé un livre avant le parcours.
export async function startJourney(userId: string) {
  const stats = await getOrCreateStats(userId);
  if (stats.journeyStartedAt) return stats;
  const hasReadBook = await prisma.userBook.findFirst({ where: { userId, status: ReadingStatus.READ }, select: { id: true } });
  if (!hasReadBook) throw badRequest("Termine ton premier livre pour lancer ton parcours.", "NO_BOOK_READ");

  await prisma.userStats.update({ where: { userId }, data: { journeyStartedAt: new Date() } });
  await validateDayIfGoalReached(userId, localDay(new Date(), stats.timezone));
  return prisma.userStats.findUniqueOrThrow({ where: { userId } });
}

export async function updateProgressSettings(userId: string, input: { dailyGoal?: number; timezone?: string }) {
  await getOrCreateStats(userId);
  const stats = await prisma.userStats.update({ where: { userId }, data: input });
  // Baisser l'objectif peut valider immédiatement la journée en cours.
  if (input.dailyGoal !== undefined) await validateDayIfGoalReached(userId, localDay(new Date(), stats.timezone));
  return prisma.userStats.findUniqueOrThrow({ where: { userId } });
}

export async function getProgressSummary(userId: string) {
  const stats = await getOrCreateStats(userId);
  const today = localDay(new Date(), stats.timezone);
  const calendarStart = dayToDate(dateToDay(new Date(dayToDate(today).getTime() - 34 * 86_400_000)));

  const [todayActivity, days, journeyDays, hasReadBook, recentXp] = await Promise.all([
    prisma.activityDay.findUnique({ where: { userId_day: { userId, day: dayToDate(today) } } }),
    prisma.activityDay.findMany({ where: { userId, day: { gte: calendarStart } }, orderBy: { day: "asc" } }),
    prisma.activityDay.count({ where: { userId, validatedAt: { not: null } } }),
    stats.journeyStartedAt ? Promise.resolve(true) : prisma.userBook.findFirst({ where: { userId, status: ReadingStatus.READ }, select: { id: true } }).then(Boolean),
    prisma.xpEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 15, select: { reason: true, amount: true, createdAt: true } })
  ]);
  const streak = displayedStreak(streakState(stats), today);
  const nextMilestone = JOURNEY_MILESTONES.find((milestone) => milestone.day > journeyDays) ?? null;

  return {
    today,
    xpTotal: stats.xpTotal,
    dailyGoal: stats.dailyGoal,
    timezone: stats.timezone,
    todayXp: todayActivity?.xp ?? 0,
    validatedToday: Boolean(todayActivity?.validatedAt),
    journeyStartedAt: stats.journeyStartedAt,
    canStartJourney: !stats.journeyStartedAt && hasReadBook,
    streak: streak.streak,
    streakAtRisk: streak.atRisk,
    longestStreak: stats.longestStreak,
    streakFreezes: stats.streakFreezes,
    journeyDays,
    nextMilestone,
    days: days.map((day) => ({ day: dateToDay(day.day), xp: day.xp, validated: Boolean(day.validatedAt), frozen: day.frozen })),
    recentXp
  };
}

export async function getBadgeOverview(userId: string) {
  await syncBadges(userId);
  const [owned, values] = await Promise.all([
    prisma.userBadge.findMany({ where: { userId }, select: { badgeSlug: true, tier: true, earnedAt: true } }),
    Promise.all(BADGES.map((badge) => metricValue(userId, badge.metric)))
  ]);

  return BADGES.map((badge, index) => {
    const value = values[index];
    const earned = owned.filter((entry) => entry.badgeSlug === badge.slug);
    return {
      ...badge,
      value,
      next: nextTier(badge, value),
      tiers: badge.tiers.map((threshold, tierIndex) => ({
        tier: tierIndex + 1,
        name: tierName(tierIndex + 1),
        threshold,
        earnedAt: earned.find((entry) => entry.tier === tierIndex + 1)?.earnedAt ?? null
      }))
    };
  });
}

// Vitrine publique : uniquement le plus haut palier obtenu par badge, sans les compteurs.
export async function getEarnedBadges(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId, suspendedAt: null }, select: { id: true } });
  if (!user) throw notFound("Lecteur introuvable.");

  const owned = await prisma.userBadge.findMany({ where: { userId }, orderBy: { earnedAt: "desc" } });
  return BADGES.flatMap((badge) => {
    const tiers = owned.filter((entry) => entry.badgeSlug === badge.slug);
    if (!tiers.length) return [];
    const best = tiers.reduce((top, entry) => (entry.tier > top.tier ? entry : top));
    return [{ slug: badge.slug, name: badge.name, description: badge.description, icon: badge.icon, tier: best.tier, tierName: tierName(best.tier), threshold: badge.tiers[best.tier - 1], unit: badge.unit, unitOne: badge.unitOne, earnedAt: best.earnedAt }];
  });
}
