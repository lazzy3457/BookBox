import { prisma } from "@/server/db/prisma";
import { notFound } from "@/server/http/errors";

export async function buildAccountExport(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      emailVerified: true,
      image: true,
      bio: true,
      role: true,
      suspendedAt: true,
      suspensionReason: true,
      createdAt: true,
      updatedAt: true
    }
  });
  if (!user) throw notFound("Compte introuvable.", "ACCOUNT_NOT_FOUND");

  const [
    library,
    reviews,
    comments,
    reviewReactions,
    commentReactions,
    following,
    followers,
    lists,
    notifications,
    notificationPreferences,
    recommendationDismissals,
    devices,
    moderationReports,
    blockedUsers,
    blockedBy
  ] = await Promise.all([
    prisma.userBook.findMany({
      where: { userId },
      include: {
        book: true,
        readingPeriods: {
          include: { entries: { orderBy: { entryDate: "asc" } } },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.review.findMany({
      where: { userId },
      include: { book: { select: { id: true, title: true, authors: true } } },
      orderBy: { createdAt: "asc" }
    }),
    prisma.reviewComment.findMany({
      where: { userId },
      include: {
        review: { select: { id: true, book: { select: { id: true, title: true } } } }
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.reviewReaction.findMany({
      where: { userId },
      select: { reviewId: true, kind: true, createdAt: true }
    }),
    prisma.reviewCommentReaction.findMany({
      where: { userId },
      select: { commentId: true, createdAt: true }
    }),
    prisma.follow.findMany({
      where: { followerId: userId },
      select: { createdAt: true, following: { select: { id: true, username: true, name: true } } }
    }),
    prisma.follow.findMany({
      where: { followingId: userId },
      select: { createdAt: true, follower: { select: { id: true, username: true, name: true } } }
    }),
    prisma.bookList.findMany({
      where: { userId },
      include: {
        entries: {
          include: { book: { select: { id: true, title: true, authors: true } } },
          orderBy: { order: "asc" }
        }
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.notification.findMany({
      where: { recipientId: userId },
      select: {
        type: true,
        title: true,
        message: true,
        targetUrl: true,
        readAt: true,
        createdAt: true,
        actor: { select: { id: true, username: true, name: true } }
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.notificationPreference.findUnique({ where: { userId } }),
    prisma.recommendationDismissal.findMany({
      where: { userId },
      select: {
        createdAt: true,
        book: { select: { id: true, title: true, authors: true } }
      }
    }),
    prisma.pushToken.findMany({
      where: { userId },
      select: { platform: true, isActive: true, createdAt: true, updatedAt: true }
    }),
    prisma.$queryRaw<Array<{
      targetType: string;
      targetId: string;
      reason: string;
      details: string | null;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    }>>`
      SELECT "targetType", "targetId", "reason", "details", "status", "createdAt", "updatedAt"
      FROM "ModerationReport"
      WHERE "reporterId" = ${userId}
      ORDER BY "createdAt" ASC
    `,
    prisma.$queryRaw<Array<{
      id: string;
      name: string | null;
      username: string | null;
      blockedAt: Date;
    }>>`
      SELECT u."id", u."name", u."username", b."createdAt" AS "blockedAt"
      FROM "UserBlock" b
      JOIN "User" u ON u."id" = b."blockedId"
      WHERE b."blockerId" = ${userId}
      ORDER BY b."createdAt" ASC
    `,
    prisma.$queryRaw<Array<{
      id: string;
      name: string | null;
      username: string | null;
      blockedAt: Date;
    }>>`
      SELECT u."id", u."name", u."username", b."createdAt" AS "blockedAt"
      FROM "UserBlock" b
      JOIN "User" u ON u."id" = b."blockerId"
      WHERE b."blockedId" = ${userId}
      ORDER BY b."createdAt" ASC
    `
  ]);

  const [legalAcceptances, legalNotices, moderationAppeals, moderationActions] = await Promise.all([
    prisma.legalAcceptance.findMany({ where: { userId }, orderBy: { acceptedAt: "asc" } }),
    user.email ? prisma.legalNotice.findMany({
      where: { reporterEmail: user.email },
      select: { trackingCode: true, targetUrl: true, legalGround: true, explanation: true, status: true, decisionReason: true, action: true, createdAt: true, resolvedAt: true }
    }) : Promise.resolve([]),
    user.email ? prisma.moderationAppeal.findMany({
      where: { email: user.email },
      select: { reason: true, status: true, response: true, createdAt: true, updatedAt: true, legalNotice: { select: { trackingCode: true } } }
    }) : Promise.resolve([]),
    prisma.moderationAction.findMany({
      where: { moderatorId: userId },
      select: { reportId: true, legalNoticeId: true, targetType: true, targetId: true, action: true, reason: true, createdAt: true }
    })
  ]);

  return {
    format: "booksbox-account-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: user,
    library,
    reviews,
    comments,
    reactions: { reviews: reviewReactions, comments: commentReactions },
    social: { following, followers, blockedUsers, blockedBy },
    lists,
    notifications,
    notificationPreferences,
    recommendationDismissals,
    devices,
    moderationReports,
    compliance: { legalAcceptances, legalNotices, moderationAppeals, moderationActions }
  };
}
