import { prisma } from "@/server/db/prisma";
import { plural } from "@/lib/format";
import type { GroupSummary } from "@/components/groups/GroupCard";

const typeLabels = { DEBATE: "Débat en cours", POLL: "Sondage", READALONG: "Lecture commune", ANNOUNCEMENT: "Annonce" } as const;

export type DirectoryGroup = GroupSummary & {
  topic: string;
  topicLabel: string | null;
  bookTitle: string | null;
  hasReadalong: boolean;
  weeklyPosts: number;
  affinity: number;
  invited: boolean;
};

// Groupes de l'onglet Communauté : les miens, et ceux à découvrir (publics, ou ceux où je suis invité).
export async function getGroupDirectory(viewerId: string | null) {
  const since = new Date(Date.now() - 7 * 86400000);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [memberships, invites, myBooks, following] = viewerId
    ? await Promise.all([
        prisma.groupMember.findMany({ where: { userId: viewerId }, select: { groupId: true } }),
        prisma.groupInvite.findMany({ where: { userId: viewerId }, select: { groupId: true } }),
        prisma.userBook.findMany({ where: { userId: viewerId }, select: { bookId: true, book: { select: { authors: true, genres: true } } } }),
        prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } })
      ])
    : [[], [], [], []];
  const myGroupIds = new Set(memberships.map((row) => row.groupId));
  const invitedIds = new Set(invites.map((row) => row.groupId));
  const myBookIds = new Set(myBooks.map((row) => row.bookId));
  const myAuthors = new Set(myBooks.flatMap((row) => row.book.authors.map((author) => author.toLowerCase())));
  const followingIds = new Set(following.map((row) => row.followingId));

  const groups = await prisma.group.findMany({
    where: { OR: [{ visibility: "PUBLIC" }, { id: { in: [...myGroupIds, ...invitedIds] } }] },
    orderBy: { updatedAt: "desc" },
    take: 120,
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      emblem: true,
      visibility: true,
      topic: true,
      topicLabel: true,
      bookId: true,
      readalongBookId: true,
      book: { select: { title: true } },
      members: { where: { user: { suspendedAt: null } }, select: { userId: true } },
      threads: {
        where: { hiddenAt: null },
        orderBy: [{ pinned: "desc" }, { lastPostAt: "desc" }],
        take: 1,
        select: { type: true, title: true }
      }
    }
  });

  const groupIds = groups.map((group) => group.id);
  const [weekly, today] = await Promise.all([
    prisma.groupPost.groupBy({ by: ["threadId"], where: { createdAt: { gte: since }, deletedAt: null, thread: { groupId: { in: groupIds } } }, _count: { _all: true } }),
    prisma.groupPost.findMany({ where: { createdAt: { gte: startOfDay }, deletedAt: null, thread: { groupId: { in: groupIds } } }, select: { thread: { select: { groupId: true } } } })
  ]);
  const threadGroups = new Map(
    (await prisma.groupThread.findMany({ where: { id: { in: weekly.map((row) => row.threadId) } }, select: { id: true, groupId: true } })).map((row) => [row.id, row.groupId])
  );
  const weeklyByGroup = new Map<string, number>();
  weekly.forEach((row) => {
    const groupId = threadGroups.get(row.threadId);
    if (groupId) weeklyByGroup.set(groupId, (weeklyByGroup.get(groupId) ?? 0) + row._count._all);
  });
  const todayByGroup = new Map<string, number>();
  today.forEach((row) => todayByGroup.set(row.thread.groupId, (todayByGroup.get(row.thread.groupId) ?? 0) + 1));

  const summaries: DirectoryGroup[] = groups.map((group) => {
    const latest = group.threads[0];
    const newToday = todayByGroup.get(group.id) ?? 0;
    const isMember = myGroupIds.has(group.id);
    const activity = isMember && newToday
      ? `${plural(newToday, "nouveau message", "nouveaux messages")} aujourd'hui`
      : latest
        ? `${typeLabels[latest.type]} : ${latest.title}`
        : null;
    const affinity =
      (group.bookId && myBookIds.has(group.bookId) ? 3 : 0) +
      (group.topic === "AUTHOR" && group.topicLabel && myAuthors.has(group.topicLabel.toLowerCase()) ? 2 : 0) +
      group.members.filter((member) => followingIds.has(member.userId)).length;
    return {
      id: group.id,
      slug: group.slug,
      name: group.name,
      description: group.description,
      emblem: group.emblem,
      visibility: group.visibility,
      memberCount: group.members.length,
      activity,
      isMember,
      topic: group.topic,
      topicLabel: group.topicLabel,
      bookTitle: group.book?.title ?? null,
      hasReadalong: Boolean(group.readalongBookId),
      weeklyPosts: weeklyByGroup.get(group.id) ?? 0,
      affinity,
      invited: invitedIds.has(group.id)
    };
  });

  return {
    mine: summaries.filter((group) => group.isMember),
    discover: summaries.filter((group) => !group.isMember)
  };
}
