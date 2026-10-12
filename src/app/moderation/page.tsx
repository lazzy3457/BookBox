import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { isAdminRole } from "@/server/auth/admin";
import { prisma } from "@/server/db/prisma";
import { listModerationReports } from "@/server/services/moderation";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ModerationReportActions } from "@/components/moderation/ModerationReportActions";
import { LegalNoticeActions } from "@/components/moderation/LegalNoticeActions";
import { listLegalNotices } from "@/server/services/legalNotices";

export const dynamic = "force-dynamic";

const reasonLabels = {
  SPAM: "Spam ou publicité",
  HARASSMENT: "Harcèlement",
  HATE_SPEECH: "Discours haineux",
  SPOILER: "Spoiler non signalé",
  INAPPROPRIATE_CONTENT: "Contenu inapproprié",
  OTHER: "Autre"
};

export default async function ModerationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role)) notFound();
  const reports = await listModerationReports();
  const legalNotices = await listLegalNotices();
  const userIds = reports.filter((report) => report.targetType === "USER").map((report) => report.targetId);
  const reviewIds = reports.filter((report) => report.targetType === "REVIEW").map((report) => report.targetId);
  const commentIds = reports.filter((report) => report.targetType === "COMMENT").map((report) => report.targetId);
  const [users, reviews, comments] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, username: true } }),
    prisma.review.findMany({ where: { id: { in: reviewIds } }, select: { id: true, body: true, bookId: true, book: { select: { title: true } }, user: { select: { name: true, username: true } } } }),
    prisma.reviewComment.findMany({ where: { id: { in: commentIds } }, select: { id: true, body: true, review: { select: { bookId: true, book: { select: { title: true } } } }, user: { select: { name: true, username: true } } } })
  ]);
  const userMap = new Map(users.map((user) => [user.id, user]));
  const reviewMap = new Map(reviews.map((review) => [review.id, review]));
  const commentMap = new Map(comments.map((comment) => [comment.id, comment]));

  return (
    <div>
      <SectionHeader eyebrow="Administration" title="Modération" description="Signalements reçus, contexte du contenu et suivi des décisions." />
      <div className="mb-7 grid gap-3 sm:grid-cols-3">
        <div className="rounded border border-line bg-panel/70 p-4"><div className="text-xs text-muted">Dossiers ouverts</div><div className="mt-1 text-2xl font-black text-paper">{reports.filter((report) => report.status === "OPEN" || report.status === "REVIEWING").length + legalNotices.filter((notice) => notice.status === "OPEN" || notice.status === "REVIEWING").length}</div></div>
        <div className="rounded border border-line bg-panel/70 p-4"><div className="text-xs text-muted">Dossiers clôturés</div><div className="mt-1 text-2xl font-black text-paper">{reports.filter((report) => report.resolvedAt).length + legalNotices.filter((notice) => notice.resolvedAt).length}</div></div>
        <div className="rounded border border-line bg-panel/70 p-4"><div className="text-xs text-muted">Contestations</div><div className="mt-1 text-2xl font-black text-paper">{legalNotices.reduce((total, notice) => total + notice.appeals.length, 0)}</div></div>
      </div>
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-black text-paper">Notifications de contenus potentiellement illicites</h2>
        <div className="space-y-4">
          {legalNotices.map((notice) => (
            <article key={notice.id} className="rounded border border-line bg-panel/80 p-5 shadow-poster">
              <div className="flex flex-wrap gap-2 text-xs font-black"><span className="text-coral">{notice.status}</span><span className="text-muted">{notice.trackingCode}</span></div>
              <a href={notice.targetUrl} rel="noreferrer" className="mt-3 block break-all font-bold text-mint">{notice.targetUrl}</a>
              <div className="mt-3 text-sm text-paper">{notice.legalGround}</div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{notice.explanation}</p>
              {notice.appeals.length ? <div className="mt-3 rounded border border-amber/30 bg-amber/5 p-3 text-xs text-muted">{notice.appeals.length} contestation(s) reçue(s). Dernière : {notice.appeals[0].reason}</div> : null}
              <LegalNoticeActions id={notice.id} initialStatus={notice.status} initialDecision={notice.decisionReason} />
            </article>
          ))}
          {!legalNotices.length ? <p className="rounded border border-line bg-panel/60 p-5 text-sm text-muted">Aucune notification légale.</p> : null}
        </div>
      </section>
      <h2 className="mb-4 text-xl font-black text-paper">Signalements communautaires</h2>
      <div className="space-y-4">
        {reports.map((report) => {
          const user = report.targetType === "USER" ? userMap.get(report.targetId) : null;
          const review = report.targetType === "REVIEW" ? reviewMap.get(report.targetId) : null;
          const comment = report.targetType === "COMMENT" ? commentMap.get(report.targetId) : null;
          const href = user ? `/profile/${user.id}` : review ? `/books/${review.bookId}` : comment ? `/books/${comment.review.bookId}` : null;
          const title = user
            ? `Profil de ${user.name ?? user.username ?? "Lecteur"}`
            : review
              ? `Review sur ${review.book.title}`
              : comment
                ? `Commentaire sur ${comment.review.book.title}`
                : "Contenu supprimé";
          const excerpt = review?.body ?? comment?.body ?? null;
          return (
            <article key={report.id} className="rounded border border-line bg-panel/80 p-5 shadow-poster">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.12em]">
                    <span className="rounded bg-coral/12 px-2 py-1 text-coral">{reasonLabels[report.reason]}</span>
                    <span className="rounded bg-ink px-2 py-1 text-muted">{report.targetType}</span>
                    <span className="rounded bg-ink px-2 py-1 text-muted">{report.status}</span>
                  </div>
                  {href ? <Link href={href} className="mt-3 block font-black text-paper hover:text-mint">{title}</Link> : <div className="mt-3 font-black text-muted">{title}</div>}
                  {excerpt ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{excerpt}</p> : null}
                  {report.details ? <p className="mt-3 rounded border border-line bg-ink/45 p-3 text-sm text-paper">{report.details}</p> : null}
                </div>
                <div className="text-xs leading-6 text-muted">
                  <div>Signalé par <strong className="text-paper">{report.reporterName ?? report.reporterUsername ?? report.reporterEmail}</strong></div>
                  <div>{report.createdAt.toLocaleString("fr-FR")}</div>
                </div>
              </div>
              <div className="mt-4 border-t border-line pt-4">
                <ModerationReportActions reportId={report.id} targetType={report.targetType} initialStatus={report.status} initialNote={report.moderatorNote} initialDecision={report.decisionReason} initialAction={report.action} />
              </div>
            </article>
          );
        })}
        {!reports.length ? <div className="rounded border border-line bg-panel/65 p-8 text-center text-sm text-muted">Aucun signalement pour le moment.</div> : null}
      </div>
    </div>
  );
}
