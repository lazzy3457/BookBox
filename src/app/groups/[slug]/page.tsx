import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { BookOpen, ChevronLeft, ScrollText, Trophy, UsersRound } from "lucide-react";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getBlockedUserIds } from "@/server/services/blocks";
import { getChallengeProgress, getGroupAccess, getReadalong, getWeeklyLeaderboard } from "@/server/services/groups";
import { Avatar } from "@/components/ui/Avatar";
import { BookCover } from "@/components/books/BookCover";
import { GroupEmblem, emblemStyle } from "@/components/groups/GroupEmblem";
import { JoinGroupButton } from "@/components/groups/JoinGroupButton";
import { InviteButton } from "@/components/groups/InviteButton";
import { GroupBellButton } from "@/components/groups/GroupBellButton";
import { ThreadComposer } from "@/components/groups/ThreadComposer";
import { GroupSettingsForm } from "@/components/groups/GroupSettingsForm";
import { ThreadBadges, threadTypeStyles } from "@/components/groups/threadTypes";
import { FollowButton } from "@/components/community/FollowButton";
import { daysUntil, plural, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

type Tab = "discussions" | "lecture" | "membres" | "apropos";
type Filter = "tout" | "debats" | "sondages" | "sans-spoilers";

const topicLabels = { BOOK: "Autour de", AUTHOR: "Autour de", GENRE: "Genre", CHALLENGE: "Défi", FREE: "Groupe libre" } as const;
const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long" });

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const group = await prisma.group.findUnique({ where: { slug }, select: { name: true, visibility: true } });
  if (!group) return { title: "Groupe introuvable" };
  return { title: group.name, robots: group.visibility === "INVITE" ? { index: false, follow: false } : undefined };
}

export default async function GroupPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ tab?: string; filtre?: string }> }) {
  const [{ slug }, query, session] = await Promise.all([params, searchParams, getServerSession(authOptions)]);
  const viewerId = session?.user?.id ?? null;
  const access = await getGroupAccess({ slug }, viewerId);
  if (!access || !access.canView) notFound();

  const tab: Tab = (["discussions", "lecture", "membres", "apropos"] as const).includes(query.tab as Tab) ? (query.tab as Tab) : "discussions";
  const filter: Filter = (["tout", "debats", "sondages", "sans-spoilers"] as const).includes(query.filtre as Filter) ? (query.filtre as Filter) : "tout";
  const blocked = viewerId ? await getBlockedUserIds(viewerId) : [];

  const group = await prisma.group.findUniqueOrThrow({
    where: { id: access.group.id },
    include: {
      createdBy: { select: { id: true, name: true } },
      book: { select: { id: true, title: true } },
      _count: { select: { members: { where: { user: { suspendedAt: null } } } } }
    }
  });

  const [threadCount, viewer, leaderboard, challenge, readalong, followingIds, myMembership] = await Promise.all([
    prisma.groupThread.count({ where: { groupId: group.id, hiddenAt: null } }),
    viewerId ? prisma.user.findUnique({ where: { id: viewerId }, select: { name: true, image: true } }) : null,
    getWeeklyLeaderboard(group.id, viewerId),
    getChallengeProgress(group.id, group.challengeGoal, group.challengeEndsAt),
    getReadalong(group.readalongBookId, group.id, viewerId),
    viewerId ? prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } }).then((rows) => new Set(rows.map((row) => row.followingId))) : new Set<string>(),
    viewerId ? prisma.groupMember.findUnique({ where: { groupId_userId: { groupId: access.group.id, userId: viewerId } }, select: { notifyAll: true } }) : null
  ]);

  const memberPreview = await prisma.groupMember.findMany({
    where: { groupId: group.id, user: { suspendedAt: null } },
    orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
    take: tab === "membres" ? 200 : 8,
    select: { role: true, joinedAt: true, user: { select: { id: true, name: true, username: true, image: true } } }
  });
  const friendsInGroup = memberPreview.filter((member) => followingIds.has(member.user.id)).map((member) => member.user.name?.split(" ")[0]).filter(Boolean);

  const style = emblemStyle(group.emblem);
  const rules = (group.rules ?? "Indique toujours jusqu'où vont les spoilers.\nOn débat des idées, pas des personnes.").split("\n").map((line) => line.replace(/^\d+[.)]\s*/, "").trim()).filter(Boolean);
  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: "discussions", label: "Discussions", count: threadCount },
    { id: "lecture", label: "Lecture commune" },
    { id: "membres", label: "Membres", count: group._count.members },
    { id: "apropos", label: "À propos" }
  ];
  const base = `/groups/${group.slug}`;

  let content: React.ReactNode;
  if (tab === "membres") {
    content = (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {memberPreview.map((member) => (
          <div key={member.user.id} className="bb-card-flat flex items-center gap-3 p-4">
            <Link href={`/profile/${member.user.id}`}><Avatar name={member.user.name} image={member.user.image} size={40} /></Link>
            <div className="min-w-0 flex-1">
              <Link href={`/profile/${member.user.id}`} className="block truncate text-sm font-extrabold text-paper hover:text-mint">{member.user.name ?? member.user.username ?? "Lecteur"}</Link>
              <p className="text-[11px] text-muted">{member.role === "MODERATOR" ? "Modérateur · " : ""}membre depuis {member.joinedAt.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
            </div>
            {viewerId && member.user.id !== viewerId ? <FollowButton userId={member.user.id} initiallyFollowing={followingIds.has(member.user.id)} /> : null}
          </div>
        ))}
      </div>
    );
  } else if (tab === "apropos") {
    content = (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section className="bb-card flex flex-col gap-4 p-6 text-sm leading-relaxed text-paper">
          <h2 className="bb-h2">À propos</h2>
          <p>{group.description ?? "Pas encore de description."}</p>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div><dt className="bb-label text-muted">Thème</dt><dd className="font-bold">{group.book ? <Link href={`/books/${group.book.id}`} className="text-mint hover:underline">{group.book.title}</Link> : group.topicLabel ?? "Libre"}</dd></div>
            <div><dt className="bb-label text-muted">Accès</dt><dd className="font-bold">{group.visibility === "PUBLIC" ? "Public" : "Sur invitation"}</dd></div>
            <div><dt className="bb-label text-muted">Créé par</dt><dd className="font-bold"><Link href={`/profile/${group.createdBy.id}`} className="hover:text-mint">{group.createdBy.name ?? "Un lecteur"}</Link></dd></div>
            <div><dt className="bb-label text-muted">Depuis</dt><dd className="font-bold">{group.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</dd></div>
          </dl>
          <div>
            <h3 className="bb-h3">Règles du groupe</h3>
            <p className="mt-1 whitespace-pre-wrap text-muted">{group.rules ?? "Indique toujours jusqu'où vont les spoilers. On débat des idées, pas des personnes."}</p>
          </div>
        </section>
        {access.isModerator ? (
          <GroupSettingsForm
            groupId={group.id}
            initial={{
              description: group.description ?? "",
              rules: group.rules ?? "",
              readalongBookId: group.readalongBookId,
              readalongTitle: readalong?.book.title ?? null,
              readalongLabel: group.readalongLabel ?? "",
              challengeGoal: group.challengeGoal ? String(group.challengeGoal) : "",
              challengeEndsAt: group.challengeEndsAt?.toISOString().slice(0, 10) ?? ""
            }}
          />
        ) : null}
      </div>
    );
  } else {
    const typeFilter = tab === "lecture" ? { type: "READALONG" as const } : filter === "debats" ? { type: "DEBATE" as const } : filter === "sondages" ? { type: "POLL" as const } : filter === "sans-spoilers" ? { spoilerLevel: null } : {};
    const threads = await prisma.groupThread.findMany({
      where: { groupId: group.id, hiddenAt: null, authorId: { notIn: blocked }, ...typeFilter },
      orderBy: [{ pinned: "desc" }, { lastPostAt: "desc" }],
      take: 50,
      select: {
        id: true,
        type: true,
        title: true,
        spoilerLevel: true,
        pinned: true,
        lastPostAt: true,
        createdAt: true,
        author: { select: { name: true } },
        poll: { select: { closesAt: true, _count: { select: { votes: true } } } },
        _count: { select: { posts: { where: { deletedAt: null, hiddenAt: null } } } },
        posts: { where: { deletedAt: null, hiddenAt: null }, orderBy: { createdAt: "desc" }, take: 3, select: { author: { select: { id: true, name: true, image: true } } } }
      }
    });

    const threadMeta = (thread: (typeof threads)[number]) => {
      const author = thread.author.name ?? "un membre";
      if (thread.pinned && thread.type === "ANNOUNCEMENT") return `Épinglé par ${author}`;
      if (thread.poll) {
        const left = thread.poll.closesAt ? daysUntil(thread.poll.closesAt) : null;
        return [`Lancé par ${author}`, left == null ? null : left > 0 ? `se termine dans ${plural(left, "jour")}` : "terminé", plural(thread.poll._count.votes, "vote")].filter(Boolean).join(" · ");
      }
      return `Lancé par ${author} · ${thread._count.posts ? `dernier message ${timeAgo(thread.lastPostAt)}` : timeAgo(thread.createdAt)}`;
    };

    content = (
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          {access.isMember && viewer ? (
            <ThreadComposer groupId={group.id} groupSlug={group.slug} viewerName={viewer.name} viewerImage={viewer.image} isModerator={access.isModerator} readalongBookId={group.readalongBookId} />
          ) : null}
          {tab === "discussions" ? (
            <div className="flex flex-wrap gap-2">
              {([["tout", "Tout"], ["debats", "Débats"], ["sondages", "Sondages"], ["sans-spoilers", "Sans spoilers"]] as const).map(([value, label]) => (
                <Link key={value} href={value === "tout" ? base : `${base}?filtre=${value}`} className={`bb-chip ${filter === value ? "bb-chip-active" : ""}`}>{label}</Link>
              ))}
            </div>
          ) : null}
          {threads.length ? (
            threads.map((thread) => {
              const typeStyle = threadTypeStyles[thread.type];
              const Icon = typeStyle.icon;
              const repliers = [...new Map(thread.posts.map((post) => [post.author.id, post.author])).values()];
              return (
                <Link key={thread.id} href={`${base}/threads/${thread.id}`} className="bb-card-flat flex items-center gap-4 p-4 transition hover:border-mint/40">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${typeStyle.circle}`}><Icon size={18} aria-hidden /></span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <ThreadBadges type={thread.type} spoilerLevel={thread.spoilerLevel} />
                    <span className="truncate font-display text-[17px] font-semibold text-paper">{thread.title}</span>
                    <span className="truncate text-[11px] text-muted">{threadMeta(thread)}</span>
                  </span>
                  <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                    {repliers.length ? (
                      <span className="flex -space-x-1.5">
                        {repliers.map((replier) => <Avatar key={replier.id} name={replier.name} image={replier.image} size={22} className="border-2 border-panel" />)}
                      </span>
                    ) : null}
                    <span className="text-[11px] font-bold text-muted">{plural(thread._count.posts, "réponse")}</span>
                  </span>
                </Link>
              );
            })
          ) : (
            <p className="bb-card-flat p-6 text-sm text-muted">
              {tab === "lecture" ? "Pas encore de fil de lecture commune." : "Aucune discussion pour l'instant."} {access.isMember ? "Lance la première !" : ""}
            </p>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          {readalong ? (
            <section className="bb-card flex flex-col gap-3 p-5">
              <h2 className="flex items-center gap-2 bb-h3"><BookOpen size={16} aria-hidden className="text-coral" />Lecture commune de {monthLabel.format(new Date())}</h2>
              <div className="flex gap-4">
                <Link href={`/books/${readalong.book.id}`}><BookCover title={readalong.book.title} thumbnailUrl={readalong.book.thumbnailUrl} className="h-[80px] w-[54px]" iconSize={0} /></Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/books/${readalong.book.id}`} className="block truncate font-display text-[15px] font-semibold text-paper hover:text-mint">{readalong.book.title}</Link>
                  {group.readalongLabel ? <p className="text-[11px] text-muted">{group.readalongLabel}</p> : null}
                  {readalong.mine?.percentage != null ? (
                    <div className="bb-track mt-2 h-1.5"><div className="h-full rounded-full bg-coral" style={{ width: `${readalong.mine.percentage}%` }} /></div>
                  ) : null}
                  <p className="mt-1.5 text-[11px] font-bold text-coral">
                    {plural(readalong.participants, "participant")}
                    {readalong.mine ? ` · tu es ${readalong.mine.chapter ? `au chapitre ${readalong.mine.chapter}` : readalong.mine.page ? `à la page ${readalong.mine.page}` : "dedans"}` : ""}
                  </p>
                </div>
              </div>
              <Link href={`${base}?tab=lecture`} className="bb-btn-soft w-full">Ouvrir les fils de lecture</Link>
            </section>
          ) : (
            <section className="bb-card flex flex-col gap-3 p-5">
              <h2 className="flex items-center gap-2 bb-h3"><BookOpen size={16} aria-hidden className="text-coral" />Lecture commune de {monthLabel.format(new Date())}</h2>
              <p className="text-xs text-muted">Pas encore de livre choisi pour ce mois-ci.</p>
              {access.isModerator ? <Link href={`${base}?tab=apropos`} className="bb-btn-soft w-full">Choisir le livre du mois</Link> : null}
            </section>
          )}

          {challenge ? (
            <section className="bb-card flex flex-col gap-3 p-5">
              <h2 className="flex items-center gap-2 bb-h3"><Trophy size={16} aria-hidden className="text-amber" />Défi : {group.challengeGoal} livres par membre{group.challengeEndsAt ? ` d'ici le ${group.challengeEndsAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : ""}</h2>
              <div className="bb-track"><div className="h-full rounded-full bg-amber" style={{ width: `${Math.min(100, challenge.percent)}%` }} /></div>
              <p className="text-[11px] font-bold text-paper">Le groupe a lu {challenge.done} livres sur {challenge.target} ({challenge.members} membres × {group.challengeGoal}) · {challenge.percent} %</p>
            </section>
          ) : (
            <section className="bb-card flex flex-col gap-3 p-5">
              <h2 className="flex items-center gap-2 bb-h3"><Trophy size={16} aria-hidden className="text-amber" />Défi du groupe</h2>
              <p className="text-xs text-muted">Aucun défi en cours. Un défi fixe un nombre de livres à lire par membre, avec une date limite.</p>
              {access.isModerator ? <Link href={`${base}?tab=apropos`} className="bb-btn-soft w-full">Lancer un défi</Link> : null}
            </section>
          )}

          <section className="bb-card flex flex-col gap-2 p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="bb-h3">Classement de la semaine</h2>
              <span className="text-[11px] font-bold text-muted">Pages lues</span>
            </div>
            {leaderboard.rows.length ? (
              leaderboard.rows.map((row) => (
                <div key={row.user.id} className={`flex items-center gap-3 rounded-xl px-2 py-1.5 ${row.user.id === viewerId ? "bg-ink" : ""}`}>
                  <span className="w-5 text-center font-display text-lg font-semibold text-mint">{row.rank}</span>
                  <Avatar name={row.user.name} image={row.user.image} size={32} />
                  <span className="min-w-0 flex-1">
                    <Link href={`/profile/${row.user.id}`} className="block truncate text-[13px] font-extrabold text-paper hover:text-mint">{row.user.id === viewerId ? "Toi" : row.user.name ?? "Lecteur"}</Link>
                    <span className="block truncate text-[11px] text-muted">{row.finished ? `a fini ${row.finished}` : plural(row.days, "jour") + " de lecture"}</span>
                  </span>
                  <span className="font-display text-[15px] font-semibold text-paper">{row.pages} p.</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted">Personne n&apos;a encore noté de page cette semaine. Note ta progression dans ton journal pour entrer au classement.</p>
            )}
            {leaderboard.viewerRow ? (
              <div className="mt-1 flex items-center gap-3 rounded-xl bg-ink px-2 py-1.5">
                <span className="w-5 text-center font-display text-lg font-semibold text-mint">{leaderboard.viewerRow.rank}</span>
                <Avatar name={leaderboard.viewerRow.user.name} image={leaderboard.viewerRow.user.image} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-extrabold text-paper">Toi</span>
                  <span className="block text-[11px] text-muted">{plural(leaderboard.viewerRow.days, "jour")} de lecture</span>
                </span>
                <span className="font-display text-[15px] font-semibold text-paper">{leaderboard.viewerRow.pages} p.</span>
              </div>
            ) : null}
          </section>

          <section className="bb-card flex flex-col gap-3 p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="flex items-center gap-2 bb-h3"><UsersRound size={16} aria-hidden className="text-mint" />Membres</h2>
              <Link href={`${base}?tab=membres`} className="text-xs font-extrabold text-mint hover:underline">Voir les {group._count.members}</Link>
            </div>
            <ul className="flex flex-col gap-2.5">
              {memberPreview.slice(0, 6).map((member) => (
                <li key={member.user.id}>
                  <Link href={`/profile/${member.user.id}`} className="group flex items-center gap-3">
                    <Avatar name={member.user.name} image={member.user.image} size={30} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-paper group-hover:text-mint">{member.user.name ?? member.user.username ?? "Lecteur"}</span>
                    {member.role === "MODERATOR" ? <span className="rounded-full bg-mint/10 px-2 py-0.5 text-[10px] font-extrabold text-mint">Modérateur</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="bb-card flex flex-col gap-3 p-5">
            <h2 className="flex items-center gap-2 bb-h3"><ScrollText size={16} aria-hidden className="text-coral" />Règles du groupe</h2>
            <ol className="flex list-decimal flex-col gap-2 pl-4 text-[13px] text-paper">
              {rules.map((rule) => <li key={rule}>{rule}</li>)}
            </ol>
            {access.isModerator ? <Link href={`${base}?tab=apropos`} className="text-xs font-extrabold text-mint hover:underline">Modifier les règles</Link> : null}
          </section>
        </aside>
      </div>
    );
  }

  return (
    <div className="-mt-6 flex min-w-0 flex-col gap-6 sm:-mt-7">
      <section className={`-mx-4 bg-gradient-to-r px-4 pb-8 pt-6 text-ink sm:-mx-6 sm:px-6 xl:-mx-10 xl:px-10 ${style.banner}`}>
        <Link href="/commu?tab=groupes" className="inline-flex items-center gap-1 text-xs font-bold text-ink/80 hover:text-ink">
          <ChevronLeft size={14} aria-hidden />
          Groupes
        </Link>
        <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-end">
          <GroupEmblem emblem={group.emblem} size={88} className="!bg-ink" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink/80">
              Groupe {group.visibility === "PUBLIC" ? "public" : "sur invitation"} · {topicLabels[group.topic]}{group.book ? ` ${group.book.title}` : group.topicLabel && group.topic !== "FREE" ? ` ${group.topicLabel}` : ""}
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight sm:text-[44px]">{group.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
              <span className="flex -space-x-1.5">
                {memberPreview.slice(0, 4).map((member) => <Avatar key={member.user.id} name={member.user.name} image={member.user.image} size={26} className="border-2 border-ink/60" />)}
              </span>
              <span>
                {plural(group._count.members, "membre")}
                {friendsInGroup.length ? ` · dont ${friendsInGroup.slice(0, 3).join(", ")}` : ""} · créé par {group.createdBy.name ?? "un lecteur"}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <JoinGroupButton groupId={group.id} isMember={access.isMember} isSignedIn={Boolean(viewerId)} tone="onBanner" />
            {access.isMember ? <InviteButton groupId={group.id} /> : null}
            {access.isMember ? <GroupBellButton groupId={group.id} initial={myMembership?.notifyAll ?? false} /> : null}
          </div>
        </div>
      </section>

      <nav aria-label="Sections du groupe" className="-mx-4 -mt-6 flex gap-6 overflow-x-auto border-b border-line bg-panel px-4 sm:-mx-6 sm:px-6 xl:-mx-10 xl:px-10">
        {tabs.map((item) => (
          <Link key={item.id} href={item.id === "discussions" ? base : `${base}?tab=${item.id}`} aria-current={tab === item.id ? "page" : undefined} className={`bb-tab pt-4 text-[15px] ${tab === item.id ? "bb-tab-active font-extrabold text-paper" : ""}`}>
            {item.label}
            {item.count != null ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${tab === item.id ? "bg-mint text-ink" : "bg-panelSoft text-muted"}`}>{item.count}</span> : null}
          </Link>
        ))}
      </nav>

      {!access.isMember && access.invited ? (
        <p className="rounded-xl bg-mint/10 px-4 py-3 text-sm font-bold text-mint">Tu as été invité dans ce groupe : rejoins-le pour participer aux discussions.</p>
      ) : null}

      {content}
    </div>
  );
}
