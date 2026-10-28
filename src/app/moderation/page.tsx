import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { isAdminRole } from "@/server/auth/admin";
import { prisma } from "@/server/db/prisma";
import { listModerationReports } from "@/server/services/moderation";
import { listLegalNotices } from "@/server/services/legalNotices";
import { ModerationWorkspace, type Dossier } from "@/components/moderation/ModerationWorkspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Modération",
  robots: { index: false, follow: false }
};

// Délai interne de traitement visé pour une notification légale, affiché comme échéance.
const LEGAL_REVIEW_DAYS = 7;

type Owner = { id: string; name: string | null; username: string | null; createdAt: Date; suspendedAt: Date | null };

function statusGroup(statuses: string[]) {
  if (statuses.includes("OPEN")) return "OPEN" as const;
  if (statuses.includes("REVIEWING")) return "REVIEWING" as const;
  return "CLOSED" as const;
}

export default async function ModerationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role)) notFound();

  const [reports, legalNotices] = await Promise.all([listModerationReports(), listLegalNotices()]);
  const ids = (type: string) => [...new Set(reports.filter((report) => report.targetType === type).map((report) => report.targetId))];
  const ownerSelect = { id: true, name: true, username: true, createdAt: true, suspendedAt: true } as const;
  const [users, reviews, comments] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids("USER") } }, select: { ...ownerSelect, bio: true } }),
    prisma.review.findMany({ where: { id: { in: ids("REVIEW") } }, select: { id: true, body: true, rating: true, hiddenAt: true, createdAt: true, bookId: true, book: { select: { title: true } }, user: { select: ownerSelect } } }),
    prisma.reviewComment.findMany({ where: { id: { in: ids("COMMENT") } }, select: { id: true, body: true, hiddenAt: true, createdAt: true, review: { select: { bookId: true, book: { select: { title: true } } } }, user: { select: ownerSelect } } })
  ]);
  const userMap = new Map(users.map((user) => [user.id, user]));
  const reviewMap = new Map(reviews.map((review) => [review.id, review]));
  const commentMap = new Map(comments.map((comment) => [comment.id, comment]));

  const ownerOf = (type: string, targetId: string): Owner | null =>
    type === "USER" ? userMap.get(targetId) ?? null : type === "REVIEW" ? reviewMap.get(targetId)?.user ?? null : commentMap.get(targetId)?.user ?? null;

  const ownerIds = [...new Set(reports.map((report) => ownerOf(report.targetType, report.targetId)?.id).filter((id): id is string => Boolean(id)))];
  const [reviewCounts, hiddenCounts] = await Promise.all([
    prisma.review.groupBy({ by: ["userId"], where: { userId: { in: ownerIds } }, _count: { _all: true } }),
    prisma.review.groupBy({ by: ["userId"], where: { userId: { in: ownerIds }, hiddenAt: { not: null } }, _count: { _all: true } })
  ]);
  const reviewCountMap = new Map(reviewCounts.map((row) => [row.userId, row._count._all]));
  const hiddenCountMap = new Map(hiddenCounts.map((row) => [row.userId, row._count._all]));

  const byTarget = new Map<string, typeof reports>();
  reports.forEach((report) => {
    const key = `${report.targetType}:${report.targetId}`;
    byTarget.set(key, [...(byTarget.get(key) ?? []), report]);
  });

  const reportDossiers: Dossier[] = [...byTarget.entries()].map(([key, items]) => {
    const first = items[0];
    const owner = ownerOf(first.targetType, first.targetId);
    const ownerReports = reports.filter((report) => ownerOf(report.targetType, report.targetId)?.id === owner?.id);
    const reasonTally = new Map<string, number>();
    items.forEach((item) => reasonTally.set(item.reason, (reasonTally.get(item.reason) ?? 0) + 1));
    const reason = [...reasonTally.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const review = first.targetType === "REVIEW" ? reviewMap.get(first.targetId) : null;
    const comment = first.targetType === "COMMENT" ? commentMap.get(first.targetId) : null;
    const user = first.targetType === "USER" ? userMap.get(first.targetId) : null;
    const handle = owner?.username ? `@${owner.username}` : owner?.name ?? "compte supprimé";
    return {
      kind: "report" as const,
      key,
      targetType: first.targetType,
      reason,
      status: statusGroup(items.map((item) => item.status)),
      title: review ? `Avis sur « ${review.book.title} »` : comment ? `Commentaire sur « ${comment.review.book.title} »` : user ? `Profil ${handle}` : "Contenu supprimé",
      heading: review ? `Avis de ${handle} sur « ${review.book.title} »` : comment ? `Commentaire de ${handle} sur « ${comment.review.book.title} »` : `Profil de ${handle}`,
      href: review ? `/books/${review.bookId}#avis` : comment ? `/books/${comment.review.bookId}#avis` : user ? `/profile/${user.id}` : null,
      content: review?.body ?? comment?.body ?? user?.bio ?? null,
      contentMeta: review ? `★ ${review.rating}/5 · publié le ${review.createdAt.toLocaleDateString("fr-FR")}` : comment ? `publié le ${comment.createdAt.toLocaleDateString("fr-FR")}` : "bio du profil",
      isHidden: Boolean(review?.hiddenAt ?? comment?.hiddenAt ?? user?.suspendedAt),
      owner: owner
        ? {
            handle,
            name: owner.name ?? owner.username ?? "Lecteur",
            memberSince: owner.createdAt.toISOString(),
            reviewCount: reviewCountMap.get(owner.id) ?? 0,
            hiddenCount: hiddenCountMap.get(owner.id) ?? 0,
            reportsReceived: ownerReports.length,
            reportsRetained: ownerReports.filter((report) => report.status === "RESOLVED" && report.action !== "NONE").length,
            suspended: Boolean(owner.suspendedAt)
          }
        : null,
      reports: items.map((item) => ({
        id: item.id,
        reporter: item.reporterUsername ? `@${item.reporterUsername}` : item.reporterName ?? "Lecteur",
        details: item.details,
        createdAt: item.createdAt.toISOString(),
        status: item.status,
        decisionReason: item.decisionReason,
        moderatorNote: item.moderatorNote
      })),
      latestAt: items.reduce((latest, item) => (item.createdAt > latest ? item.createdAt : latest), items[0].createdAt).toISOString()
    };
  });

  const legalDossiers: Dossier[] = legalNotices.map((notice) => ({
    kind: "legal" as const,
    key: `LEGAL:${notice.id}`,
    noticeId: notice.id,
    trackingCode: notice.trackingCode,
    status: notice.status === "OPEN" ? "OPEN" : notice.status === "REVIEWING" ? "REVIEWING" : "CLOSED",
    noticeStatus: notice.status,
    legalGround: notice.legalGround,
    explanation: notice.explanation,
    targetUrl: notice.targetUrl,
    createdAt: notice.createdAt.toISOString(),
    resolvedAt: notice.resolvedAt?.toISOString() ?? null,
    deadline: new Date(notice.createdAt.getTime() + LEGAL_REVIEW_DAYS * 86400000).toISOString(),
    decisionReason: notice.decisionReason,
    appeals: notice.appeals.map((appeal) => ({ id: appeal.id, reason: appeal.reason, createdAt: appeal.createdAt.toISOString() }))
  }));

  return <ModerationWorkspace dossiers={[...legalDossiers, ...reportDossiers]} />;
}
