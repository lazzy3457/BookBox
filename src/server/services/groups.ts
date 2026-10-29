import { ReadingStatus, type GroupRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { notFound } from "@/server/http/errors";
import { slugifyAuthor } from "@/lib/authors";

function forbidden(message: string, code = "FORBIDDEN") {
  return Object.assign(new Error(message), { status: 403, code });
}

export async function uniqueGroupSlug(name: string) {
  const base = slugifyAuthor(name).slice(0, 60) || "groupe";
  let slug = base;
  for (let attempt = 2; await prisma.group.findUnique({ where: { slug }, select: { id: true } }); attempt += 1) {
    slug = `${base}-${attempt}`;
  }
  return slug;
}

export type GroupAccess = {
  group: { id: string; slug: string; name: string; visibility: "PUBLIC" | "INVITE" };
  role: GroupRole | null;
  invited: boolean;
  canView: boolean;
  isMember: boolean;
  isModerator: boolean;
};

// Droits d'un lecteur sur un groupe : un groupe sur invitation n'est visible que des membres et des invités.
export async function getGroupAccess(where: { id: string } | { slug: string }, viewerId: string | null): Promise<GroupAccess | null> {
  const group = await prisma.group.findUnique({ where, select: { id: true, slug: true, name: true, visibility: true } });
  if (!group) return null;
  const [membership, invite] = viewerId
    ? await Promise.all([
        prisma.groupMember.findUnique({ where: { groupId_userId: { groupId: group.id, userId: viewerId } }, select: { role: true } }),
        prisma.groupInvite.findUnique({ where: { groupId_userId: { groupId: group.id, userId: viewerId } }, select: { id: true } })
      ])
    : [null, null];
  const isMember = Boolean(membership);
  return {
    group,
    role: membership?.role ?? null,
    invited: Boolean(invite),
    canView: group.visibility === "PUBLIC" || isMember || Boolean(invite),
    isMember,
    isModerator: membership?.role === "MODERATOR"
  };
}

export async function requireGroupMember(groupId: string, userId: string) {
  const access = await getGroupAccess({ id: groupId }, userId);
  if (!access || !access.canView) throw notFound("Groupe introuvable.", "GROUP_NOT_FOUND");
  if (!access.isMember) throw forbidden("Rejoins le groupe pour participer.", "GROUP_MEMBERSHIP_REQUIRED");
  return access;
}

export async function requireThreadMember(threadId: string, userId: string) {
  const thread = await prisma.groupThread.findFirst({ where: { id: threadId, hiddenAt: null }, select: { id: true, groupId: true, authorId: true } });
  if (!thread) throw notFound("Discussion introuvable.", "GROUP_THREAD_NOT_FOUND");
  const access = await requireGroupMember(thread.groupId, userId);
  return { thread, access };
}

export { forbidden as groupForbidden };

const DAY = 86400000;

// Classement de la semaine : pages lues sur 7 jours par membre, comme le classement d'un club Strava.
export async function getWeeklyLeaderboard(groupId: string, viewerId: string | null, limit = 4) {
  const since = new Date(Date.now() - 7 * DAY);
  const members = await prisma.groupMember.findMany({
    where: { groupId, user: { suspendedAt: null } },
    select: { userId: true, user: { select: { id: true, name: true, image: true } } }
  });
  if (!members.length) return { rows: [], viewerRow: null };
  const periods = await prisma.readingPeriod.findMany({
    where: { userBook: { userId: { in: members.map((member) => member.userId) } }, entries: { some: { entryDate: { gte: since } } } },
    select: {
      startedAt: true,
      finishedAt: true,
      userBook: { select: { userId: true, book: { select: { title: true } } } },
      entries: { where: { page: { not: null }, kind: "NOTE" }, orderBy: { entryDate: "asc" }, select: { entryDate: true, page: true } }
    }
  });

  const totals = new Map<string, { pages: number; days: Set<string>; finished: string | null }>();
  periods.forEach((period) => {
    const userId = period.userBook.userId;
    const row = totals.get(userId) ?? { pages: 0, days: new Set<string>(), finished: null };
    const before = period.entries.filter((entry) => entry.entryDate < since).pop();
    const inWindow = period.entries.filter((entry) => entry.entryDate >= since);
    let previous = before?.page ?? (period.startedAt && period.startedAt >= since ? 0 : inWindow[0]?.page ?? 0);
    inWindow.forEach((entry) => {
      row.pages += Math.max(0, (entry.page ?? 0) - previous);
      previous = entry.page ?? previous;
      row.days.add(entry.entryDate.toISOString().slice(0, 10));
    });
    if (period.finishedAt && period.finishedAt >= since) row.finished = period.userBook.book.title;
    totals.set(userId, row);
  });

  const ranked = members
    .map((member) => {
      const total = totals.get(member.userId);
      return { user: member.user, pages: total?.pages ?? 0, days: total?.days.size ?? 0, finished: total?.finished ?? null };
    })
    .sort((a, b) => b.pages - a.pages || b.days - a.days)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const rows = ranked.filter((row) => row.pages > 0).slice(0, limit);
  const viewerRow = viewerId ? ranked.find((row) => row.user.id === viewerId) ?? null : null;
  return { rows, viewerRow: viewerRow && !rows.some((row) => row.user.id === viewerId) ? viewerRow : null };
}

// Défi collectif : livres terminés par les membres depuis leur arrivée, plafonnés à l'objectif de chacun.
export async function getChallengeProgress(groupId: string, goal: number | null, endsAt: Date | null) {
  if (!goal) return null;
  const members = await prisma.groupMember.findMany({ where: { groupId, user: { suspendedAt: null } }, select: { userId: true, joinedAt: true } });
  if (!members.length) return { done: 0, target: 0, percent: 0, members: 0 };
  const reads = await prisma.userBook.groupBy({
    by: ["userId"],
    where: {
      status: ReadingStatus.READ,
      OR: members.map((member) => ({ userId: member.userId, updatedAt: { gte: member.joinedAt, lte: endsAt ?? new Date() } }))
    },
    _count: { _all: true }
  });
  const done = reads.reduce((total, row) => total + Math.min(goal, row._count._all), 0);
  const target = goal * members.length;
  return { done, target, percent: target ? Math.round((done / target) * 100) : 0, members: members.length };
}

// Lecture commune : participants qui ont le livre en cours et où en est le lecteur.
export async function getReadalong(bookId: string | null, groupId: string, viewerId: string | null) {
  if (!bookId) return null;
  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { id: true, title: true, thumbnailUrl: true, pageCount: true } });
  if (!book) return null;
  const memberIds = (await prisma.groupMember.findMany({ where: { groupId }, select: { userId: true } })).map((member) => member.userId);
  const [participants, mine] = await Promise.all([
    prisma.userBook.count({ where: { bookId, userId: { in: memberIds }, status: { in: [ReadingStatus.READING, ReadingStatus.READ] } } }),
    viewerId
      ? prisma.readingEntry.findFirst({
          where: { period: { userBook: { userId: viewerId, bookId } }, kind: "NOTE", OR: [{ page: { not: null } }, { chapter: { not: null } }] },
          orderBy: { entryDate: "desc" },
          select: { page: true, chapter: true, percentage: true }
        })
      : null
  ]);
  return { book, participants, mine };
}
