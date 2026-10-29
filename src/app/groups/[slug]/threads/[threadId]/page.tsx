import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getBlockedUserIds } from "@/server/services/blocks";
import { getGroupAccess } from "@/server/services/groups";
import { Avatar } from "@/components/ui/Avatar";
import { GroupEmblem } from "@/components/groups/GroupEmblem";
import { GroupLikeButton } from "@/components/groups/GroupLikeButton";
import { GroupPosts, type GroupPostView } from "@/components/groups/GroupPosts";
import { PollBox } from "@/components/groups/PollBox";
import { ThreadBadges } from "@/components/groups/threadTypes";
import { JoinGroupButton } from "@/components/groups/JoinGroupButton";
import { ReportButton } from "@/components/moderation/ReportButton";
import { daysUntil, plural, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ threadId: string }> }): Promise<Metadata> {
  const { threadId } = await params;
  const thread = await prisma.groupThread.findUnique({ where: { id: threadId }, select: { title: true } });
  return { title: thread?.title ?? "Discussion introuvable", robots: { index: false, follow: false } };
}

export default async function GroupThreadPage({ params }: { params: Promise<{ slug: string; threadId: string }> }) {
  const [{ slug, threadId }, session] = await Promise.all([params, getServerSession(authOptions)]);
  const viewerId = session?.user?.id ?? null;
  const access = await getGroupAccess({ slug }, viewerId);
  if (!access || !access.canView) notFound();
  const blocked = new Set(viewerId ? await getBlockedUserIds(viewerId) : []);

  const thread = await prisma.groupThread.findFirst({
    where: { id: threadId, groupId: access.group.id, hiddenAt: null },
    include: {
      author: { select: { id: true, name: true, image: true } },
      reactions: { select: { userId: true } },
      poll: { include: { options: { orderBy: { position: "asc" }, include: { _count: { select: { votes: true } } } }, votes: { where: { userId: viewerId ?? "" }, select: { optionId: true } } } },
      posts: {
        where: { hiddenAt: null, author: { suspendedAt: null } },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, image: true } }, reactions: { select: { userId: true } } }
      }
    }
  });
  if (!thread || blocked.has(thread.authorId)) notFound();

  const [group, moderators, viewer, others] = await Promise.all([
    prisma.group.findUniqueOrThrow({ where: { id: access.group.id }, select: { id: true, slug: true, name: true, emblem: true, visibility: true, rules: true, _count: { select: { members: true } } } }),
    prisma.groupMember.findMany({ where: { groupId: access.group.id, role: "MODERATOR" }, select: { userId: true } }).then((rows) => new Set(rows.map((row) => row.userId))),
    viewerId ? prisma.user.findUnique({ where: { id: viewerId }, select: { name: true, image: true } }) : null,
    prisma.groupThread.findMany({
      where: { groupId: access.group.id, hiddenAt: null, id: { not: thread.id }, type: { in: ["DEBATE", "POLL"] } },
      orderBy: { lastPostAt: "desc" },
      take: 3,
      select: { id: true, title: true, _count: { select: { posts: { where: { deletedAt: null } } } } }
    })
  ]);

  const posts: GroupPostView[] = thread.posts
    .filter((post) => !blocked.has(post.authorId))
    .map((post) => ({
      id: post.id,
      parentId: post.parentId,
      body: post.deletedAt ? "" : post.body,
      deleted: Boolean(post.deletedAt),
      createdAt: post.createdAt.toISOString(),
      author: { id: post.author.id, name: post.author.name ?? "Lecteur", image: post.author.image, isModerator: moderators.has(post.author.id) },
      likes: post.reactions.length,
      likedByMe: Boolean(viewerId && post.reactions.some((reaction) => reaction.userId === viewerId)),
      canDelete: Boolean(viewerId && !post.deletedAt && (post.authorId === viewerId || access.isModerator))
    }));
  const replies = posts.filter((post) => !post.deleted).length;
  const pollLeft = thread.poll?.closesAt ? daysUntil(thread.poll.closesAt) : null;
  const rules = (group.rules ?? "Indique toujours jusqu'où vont les spoilers.\nOn débat des idées, pas des personnes.").split("\n").map((line) => line.replace(/^\d+[.)]\s*/, "").trim()).filter(Boolean);

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-6">
        <Link href={`/groups/${group.slug}`} className="inline-flex w-fit items-center gap-1 text-[13px] font-extrabold text-mint hover:underline">
          <ChevronLeft size={15} aria-hidden />
          {group.name}
        </Link>

        <article className="bb-card flex flex-col gap-4 p-6 sm:p-7">
          <ThreadBadges type={thread.type} spoilerLevel={thread.spoilerLevel} />
          <h1 className="font-display text-3xl font-semibold leading-tight text-paper sm:text-4xl">{thread.title}</h1>
          <p className="flex items-center gap-2.5 text-xs">
            <Link href={`/profile/${thread.author.id}`}><Avatar name={thread.author.name} image={thread.author.image} size={30} /></Link>
            <span>
              <Link href={`/profile/${thread.author.id}`} className="block text-[13px] font-extrabold text-paper hover:text-mint">
                {thread.author.name ?? "Lecteur"}{moderators.has(thread.author.id) ? " · modérateur" : ""}
              </Link>
              <span className="text-muted">{timeAgo(thread.createdAt)}</span>
            </span>
          </p>
          {thread.body ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-paper">{thread.body}</p> : null}
          {thread.poll ? (
            <PollBox
              pollId={thread.poll.id}
              question={thread.poll.question}
              options={thread.poll.options.map((option) => ({ id: option.id, label: option.label, votes: option._count.votes }))}
              myVote={thread.poll.votes[0]?.optionId ?? null}
              daysLeft={pollLeft}
              isClosed={pollLeft != null && pollLeft <= 0}
              canVote={access.isMember}
            />
          ) : null}
          <div className="flex items-center gap-4 text-[13px]">
            <GroupLikeButton endpoint={`/api/group-threads/${thread.id}/reactions`} count={thread.reactions.length} initiallyLiked={Boolean(viewerId && thread.reactions.some((reaction) => reaction.userId === viewerId))} canLike={access.isMember} />
            <span className="inline-flex items-center gap-1 font-bold text-muted"><MessageCircle size={15} aria-hidden />{plural(replies, "réponse")}</span>
            {viewerId && thread.authorId !== viewerId ? <span className="ml-auto"><ReportButton targetType="GROUP_THREAD" targetId={thread.id} compact /></span> : null}
          </div>
        </article>

        {!access.isMember ? (
          <div className="bb-card-flat flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-muted">Rejoins le groupe pour voter, réagir et répondre.</p>
            <JoinGroupButton groupId={group.id} isMember={false} isSignedIn={Boolean(viewerId)} />
          </div>
        ) : null}

        <GroupPosts threadId={thread.id} posts={posts} viewerId={viewerId} viewerName={viewer?.name ?? null} viewerImage={viewer?.image ?? null} canPost={access.isMember} />
      </div>

      <aside className="flex flex-col gap-5 lg:pt-11">
        <Link href={`/groups/${group.slug}`} className="bb-card flex items-center gap-4 p-5 transition hover:border-mint/40">
          <GroupEmblem emblem={group.emblem} size={44} className="!bg-ink !shadow-none" />
          <span>
            <span className="block bb-h3">{group.name}</span>
            <span className="block text-[11px] text-muted">{plural(group._count.members, "membre")} · {group.visibility === "PUBLIC" ? "Public" : "Sur invitation"}</span>
          </span>
        </Link>
        <section className="bb-card flex flex-col gap-3 p-5">
          <h2 className="bb-h3">Règles du groupe</h2>
          <ol className="flex list-decimal flex-col gap-2 pl-4 text-[13px] text-paper">
            {rules.map((rule) => <li key={rule}>{rule}</li>)}
          </ol>
        </section>
        {others.length ? (
          <section className="bb-card flex flex-col gap-3 p-5">
            <h2 className="bb-h3">Autres débats</h2>
            {others.map((other) => (
              <Link key={other.id} href={`/groups/${group.slug}/threads/${other.id}`} className="group">
                <span className="block text-[13px] font-extrabold text-paper group-hover:text-mint">{other.title}</span>
                <span className="block text-[11px] text-muted">{plural(other._count.posts, "réponse")}</span>
              </Link>
            ))}
          </section>
        ) : null}
      </aside>
    </div>
  );
}
