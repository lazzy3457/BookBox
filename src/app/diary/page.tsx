import Link from "next/link";
import { getServerSession } from "next-auth";
import { BookOpen, CalendarDays, CheckCircle2, Eye, Lock, Play } from "lucide-react";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { SectionHeader } from "@/components/ui/SectionHeader";

export const dynamic = "force-dynamic";

type DiaryEvent = {
  id: string;
  date: Date;
  kind: "started" | "finished" | "progress";
  book: { id: string; title: string; authors: string[]; thumbnailUrl: string | null };
  isReread: boolean;
  isPublic: boolean | null;
  page?: number | null;
  percentage?: number | null;
  chapter?: string | null;
  note?: string | null;
};

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(date);
}

export default async function DiaryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return (
      <div className="rounded border border-line bg-panel/75 p-8">
        <h1 className="text-2xl font-black text-paper">Journal de lecture</h1>
        <p className="mt-3 text-muted">Connecte-toi pour retrouver toute ta chronologie de lecture.</p>
        <Link href="/login" className="mt-5 inline-block rounded bg-mint px-5 py-3 font-black text-ink">Connexion</Link>
      </div>
    );
  }

  const periods = await prisma.readingPeriod.findMany({
    where: { userBook: { userId: session.user.id } },
    include: {
      userBook: { include: { book: true } },
      entries: { orderBy: { entryDate: "desc" } }
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  const events: DiaryEvent[] = periods.flatMap((period) => {
    const book = {
      id: period.userBook.book.id,
      title: period.userBook.book.title,
      authors: period.userBook.book.authors,
      thumbnailUrl: period.userBook.book.thumbnailUrl
    };
    const periodEvents: DiaryEvent[] = [];
    if (period.startedAt) periodEvents.push({ id: `${period.id}-started`, date: period.startedAt, kind: "started", book, isReread: period.isReread, isPublic: null });
    if (period.finishedAt) periodEvents.push({ id: `${period.id}-finished`, date: period.finishedAt, kind: "finished", book, isReread: period.isReread, isPublic: null });
    periodEvents.push(...period.entries.map((entry) => ({
      id: entry.id,
      date: entry.entryDate,
      kind: "progress" as const,
      book,
      isReread: period.isReread,
      isPublic: entry.isPublic,
      page: entry.page,
      percentage: entry.percentage,
      chapter: entry.chapter,
      note: entry.note
    })));
    return periodEvents;
  }).sort((a, b) => b.date.getTime() - a.date.getTime());

  const grouped = events.reduce<Map<string, DiaryEvent[]>>((map, event) => {
    const key = monthLabel(event.date);
    map.set(key, [...(map.get(key) ?? []), event]);
    return map;
  }, new Map());

  return (
    <div className="min-w-0 overflow-hidden">
      <SectionHeader eyebrow="Chronologie" title="Journal de lecture" description="Tes débuts, fins de lecture, chapitres et progressions, rangés jour après jour." />
      {events.length ? (
        <div className="overflow-hidden rounded border border-line bg-panel/65 shadow-poster">
          <div className="hidden grid-cols-[92px_56px_minmax(220px,1fr)_minmax(180px,0.7fr)_90px] gap-4 border-b border-line bg-ink/55 px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-muted md:grid">
            <span>Mois</span>
            <span>Jour</span>
            <span>Livre</span>
            <span>Entrée</span>
            <span className="text-right">Visibilité</span>
          </div>
          {[...grouped.entries()].map(([month, monthEvents]) => (
            <section key={month} className="border-b border-line last:border-b-0">
              <h2 className="border-b border-line bg-ink/30 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-muted md:hidden">{month}</h2>
              <div className="divide-y divide-line">
                {monthEvents.map((event, index) => {
                  const Icon = event.kind === "finished" ? CheckCircle2 : event.kind === "started" ? Play : CalendarDays;
                  const description = event.kind === "finished"
                    ? event.isReread ? "Relecture terminée" : "Lecture terminée"
                    : event.kind === "started"
                      ? event.isReread ? "Relecture commencée" : "Lecture commencée"
                      : [event.chapter ? `Chapitre ${event.chapter}` : null, event.page ? `page ${event.page}` : null, event.percentage != null ? `${event.percentage}%` : null].filter(Boolean).join(" · ") || "Note de lecture";
                  return (
                    <article key={event.id} className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition hover:bg-white/[0.025] md:grid-cols-[92px_56px_minmax(220px,1fr)_minmax(180px,0.7fr)_90px] md:gap-4 md:px-5">
                      <span className="hidden text-xs font-bold capitalize text-muted md:block">{index === 0 ? month.replace(/\s+\d{4}$/, "") : ""}</span>
                      <time className="text-center text-lg font-black text-paper md:text-left md:text-sm" dateTime={event.date.toISOString()}>
                        {event.date.toLocaleDateString("fr-FR", { day: "2-digit" })}
                      </time>
                      <div className="flex min-w-0 items-center gap-3">
                        <Link href={`/books/${event.book.id}`} className="cover-sheen h-[54px] w-9 shrink-0 overflow-hidden rounded-sm border border-line bg-panelSoft">
                          {event.book.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={event.book.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                          ) : <div className="grid h-full place-items-center"><BookOpen size={14} className="text-muted" /></div>}
                        </Link>
                        <div className="min-w-0">
                          <Link href={`/books/${event.book.id}`} className="block truncate text-sm font-black text-paper hover:text-mint">{event.book.title}</Link>
                          <p className="mt-1 truncate text-[11px] text-muted">{event.book.authors.join(", ") || "Auteur inconnu"}</p>
                        </div>
                      </div>
                      <div className="col-span-2 col-start-2 min-w-0 md:col-span-1 md:col-start-auto">
                        <div className="flex items-center gap-2 text-xs font-black text-mint"><Icon size={12} />{description}</div>
                        {event.note ? <p className="mt-1 truncate text-xs text-muted">{event.note}</p> : null}
                      </div>
                      <span className="row-start-1 inline-flex items-center justify-end gap-1 text-[10px] font-bold text-muted md:row-start-auto md:text-xs">
                        {event.isPublic !== null ? <>{event.isPublic ? <Eye size={12} /> : <Lock size={12} />}<span className="hidden sm:inline">{event.isPublic ? "Public" : "Privé"}</span></> : null}
                      </span>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded border border-line bg-panel/65 p-8 text-sm text-muted">Ton journal est encore vide. Commence une lecture ou ajoute un chapitre depuis une fiche livre.</div>
      )}
    </div>
  );
}
