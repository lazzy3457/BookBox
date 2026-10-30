import Link from "next/link";
import { getServerSession } from "next-auth";
import { ReadingStatus } from "@prisma/client";
import { BookHeart, MessageSquareText, Plus, Quote, Search, Star } from "lucide-react";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getFriendActivity } from "@/server/services/feed";
import { getTrendingBooks } from "@/server/services/trending";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Avatar } from "@/components/ui/Avatar";
import { BookCover } from "@/components/books/BookCover";
import { StarRating } from "@/components/reviews/StarRating";
import { CurrentReadCard } from "@/components/home/CurrentReadCard";
import { FriendActivity, type FriendActivityItem } from "@/components/activity/FriendActivity";
import { ShowMore } from "@/components/ui/ShowMore";
import { daysSince, greeting, plural, timeAgo } from "@/lib/format";
import { GENRES, genreLabel } from "@/lib/genres";

export const dynamic = "force-dynamic";

type TrendingBook = Awaited<ReturnType<typeof getTrendingBooks>>[number];

const heroGenres = ["fantasy", "science-fiction", "romance", "thriller", "policier", "classique", "bd-manga"];

const statusActions: Record<ReadingStatus, string> = {
  READING: "a commencé",
  READ: "a terminé",
  TO_READ: "veut lire",
  ABANDONED: "a abandonné"
};

function excerpt(body: string | null, spoiler: boolean, max = 180) {
  if (!body) return null;
  if (spoiler) return "Cet avis contient des spoilers.";
  return body.length > max ? `${body.slice(0, max).trimEnd()}…` : body;
}

function readersLabel(book: TrendingBook) {
  return plural(new Set(book.libraries.map((entry) => entry.userId)).size, "lecteur");
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const trending = await getTrendingBooks();

  if (!session?.user?.id) {
    return <GuestHome trending={trending} />;
  }

  const userId = session.user.id;
  const [activity, currentReads] = await Promise.all([
    getFriendActivity(userId),
    prisma.userBook.findMany({
      where: { userId, status: ReadingStatus.READING },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        book: true,
        readingPeriods: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { entries: { where: { page: { not: null }, kind: "NOTE" }, orderBy: { entryDate: "desc" }, take: 1 } }
        }
      }
    })
  ]);

  const activityItems: FriendActivityItem[] = activity.slice(0, 30).map((item) =>
    item.type === "review"
      ? {
          id: item.id,
          userId: item.review.userId,
          userName: item.review.user.name ?? "Un lecteur",
          userImage: item.review.user.image,
          action: "a noté",
          bookId: item.review.bookId,
          bookTitle: item.review.book.title,
          bookThumbnail: item.review.book.thumbnailUrl,
          meta: [item.review.book.authors[0], timeAgo(item.createdAt)].filter(Boolean).join(" · "),
          review: {
            id: item.review.id,
            liked: item.review.reactions.some((reaction) => reaction.userId === userId && reaction.kind === "LIKE"),
            rating: item.review.rating,
            excerpt: excerpt(item.review.body, item.review.spoiler),
            likes: item.review.reactions.length,
            comments: item.review.comments.length
          }
        }
      : {
          id: item.id,
          userId: item.entry.userId,
          userName: item.entry.user.name ?? "Un lecteur",
          userImage: item.entry.user.image,
          action: statusActions[item.entry.status],
          bookId: item.entry.bookId,
          bookTitle: item.entry.book.title,
          bookThumbnail: item.entry.book.thumbnailUrl,
          meta: [
            item.entry.book.authors[0],
            item.entry.status === ReadingStatus.TO_READ ? "ajouté à « À lire »" : null,
            timeAgo(item.createdAt)
          ].filter(Boolean).join(" · ")
        }
  );

  const firstName = (session.user.name ?? "lecteur").split(" ")[0];

  return (
    <div className="flex min-w-0 flex-col gap-6 sm:gap-8">
      <h1 className="font-display text-[28px] font-semibold leading-tight text-paper sm:text-[44px]">
        {greeting()} {firstName}
      </h1>

      <div className="grid grid-cols-1 min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section aria-labelledby="reprendre" className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 id="reprendre" className="bb-h2">Reprendre ma lecture</h2>
            <span className="shrink-0 text-xs font-bold text-muted sm:text-sm">{plural(currentReads.length, "livre")} en cours</span>
          </div>
          {currentReads.length ? (
            <ShowMore initial={2} className="flex flex-col gap-4">
            {currentReads.map((item) => {
              const period = item.readingPeriods[0];
              const entry = period?.entries[0];
              const startedAt = period?.startedAt ?? item.updatedAt;
              const days = daysSince(startedAt);
              return (
                <CurrentReadCard
                  key={item.id}
                  bookId={item.bookId}
                  title={item.book.title}
                  author={item.book.authors.join(", ") || "Auteur inconnu"}
                  thumbnailUrl={item.book.thumbnailUrl}
                  sinceLabel={days === 0 ? "Commencé aujourd'hui" : `En cours depuis ${plural(days, "jour")}`}
                  periodId={period?.id ?? null}
                  page={entry?.page ?? null}
                  pageCount={item.book.pageCount}
                  percentage={entry?.percentage ?? null}
                />
              );
            })}
            </ShowMore>
          ) : (
            <div className="bb-card flex flex-col items-start gap-3 p-6">
              <p className="bb-h3">Aucune lecture en cours</p>
              <p className="text-sm text-muted">Choisis ton prochain livre : il apparaîtra ici avec ta progression.</p>
              <Link href="/search" className="bb-btn-primary">
                <Search size={16} aria-hidden />
                Trouver un livre
              </Link>
            </div>
          )}
        </section>

        <section aria-labelledby="tendances-semaine" className="bb-card flex h-fit flex-col gap-1 p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3 pb-2">
            <h2 id="tendances-semaine" className="bb-h3">Tendances de la semaine</h2>
            <Link href="/trending" className="shrink-0 text-[13px] font-extrabold text-mint hover:underline">Tout voir</Link>
          </div>
          {trending.length ? (
            trending.slice(0, 5).map((book, index) => (
              // Sur mobile, le top 3 suffit : le classement complet est sur /trending.
              <Link key={book.id} href={`/books/${book.id}`} className={`group items-center gap-3.5 py-2 sm:py-2.5 ${index >= 3 ? "hidden sm:flex" : "flex"}`}>
                <span className="w-7 shrink-0 text-center font-display text-2xl font-semibold leading-tight text-mint sm:w-10 sm:text-[30px]">{index + 1}</span>
                <BookCover title={book.title} thumbnailUrl={book.thumbnailUrl} className="h-[60px] w-10 rounded-xl" iconSize={0} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-display text-[15px] font-semibold text-paper group-hover:text-mint">{book.title}</span>
                  <span className="truncate text-xs text-muted">{[book.authors[0], readersLabel(book)].filter(Boolean).join(" · ")}</span>
                </span>
              </Link>
            ))
          ) : (
            <p className="py-2 text-sm text-muted">Les tendances apparaîtront dès que la communauté lira.</p>
          )}
        </section>
      </div>

      <section aria-labelledby="amis" className="flex min-w-0 flex-col gap-3">
        <SectionHeader as="h2" eyebrow="Social" title="Du côté de tes amis" />
        {activityItems.length ? (
          <ShowMore initial={5}>
            {activityItems.map((item) => <FriendActivity key={item.id} item={item} />)}
          </ShowMore>
        ) : (
          <div className="bb-card-flat flex flex-col items-start gap-3 p-6 text-sm text-muted">
            Aucune activité pour l&apos;instant : suis des lecteurs pour voir ce qu&apos;ils lisent.
            <Link href="/commu" className="bb-btn-soft">Trouver des lecteurs</Link>
          </div>
        )}
      </section>
    </div>
  );
}

async function GuestHome({ trending }: { trending: TrendingBook[] }) {
  const featured = trending[0];
  const [featuredReview, recentReaders] = featured
    ? await Promise.all([
        prisma.review.findFirst({
          where: { bookId: featured.id, hiddenAt: null, spoiler: false, body: { not: null }, user: { suspendedAt: null } },
          orderBy: [{ reactions: { _count: "desc" } }, { createdAt: "desc" }],
          include: { user: { select: { name: true } } }
        }),
        prisma.userBook.findMany({
          where: { bookId: featured.id, status: ReadingStatus.READ, user: { suspendedAt: null } },
          orderBy: { updatedAt: "desc" },
          take: 5,
          include: { user: { select: { id: true, name: true, image: true } } }
        })
      ])
    : [null, []];
  const readerCount = featured
    ? await prisma.userBook.count({ where: { bookId: featured.id, status: ReadingStatus.READ, user: { suspendedAt: null } } })
    : 0;

  return (
    <div className="flex min-w-0 flex-col gap-8 sm:gap-10">
      <section className="flex flex-col items-center gap-4 pt-2 text-center sm:gap-5 sm:pt-6">
        <h1 className="font-display text-[32px] font-semibold leading-tight text-paper sm:text-5xl">Que veux-tu lire ensuite ?</h1>
        <form action="/search" className="flex w-full max-w-[760px] items-center gap-3 rounded-full border border-line bg-panel py-1.5 pl-4 pr-1.5 shadow-poster sm:gap-3 sm:pl-5">
          <Search size={18} aria-hidden className="shrink-0 text-muted" />
          <label htmlFor="hero-search" className="sr-only">Rechercher un livre</label>
          <input id="hero-search" name="q" placeholder="Titre, auteur ou ISBN" className="min-w-0 flex-1 bg-transparent py-2 text-base text-paper outline-none placeholder:text-muted/80" />
          <button type="submit" className="bb-btn-primary px-4 py-2.5 text-sm sm:px-5">Rechercher</button>
        </form>
        <div className="bb-chip-row justify-center">
          <Link href="/search" className="bb-chip bb-chip-active">Tout</Link>
          {heroGenres.map((slug, index) => (
            <Link key={slug} href={`/search?genre=${slug}`} className={`bb-chip ${index >= 5 ? "hidden sm:inline-flex" : ""}`}>
              {genreLabel(slug) ?? GENRES.find((genre) => genre.slug === slug)?.label}
            </Link>
          ))}
        </div>
      </section>

      {featured ? (
        <section aria-labelledby="livre-semaine" className="bb-card grid gap-5 p-5 sm:gap-8 sm:p-10 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)_200px]">
          <Link href={`/books/${featured.id}`} className="mx-auto md:mx-0">
            <BookCover title={featured.title} thumbnailUrl={featured.thumbnailUrl} showTitle className="h-[210px] w-[140px] shadow-poster sm:h-[330px] sm:w-[220px]" iconSize={20} />
          </Link>
          <div className="flex min-w-0 flex-col items-start gap-3">
            <span className="bb-badge">Livre de la semaine</span>
            <h2 id="livre-semaine" className="font-display text-[26px] font-semibold leading-tight text-paper sm:text-4xl">{featured.title}</h2>
            <p className="text-sm text-muted">
              {[featured.authors[0], featured.publishedDate?.slice(0, 4), featured.genres[0] ? genreLabel(featured.genres[0]) : null].filter(Boolean).join(" · ")}
            </p>
            {featured.averageRating ? (
              <div className="flex items-center gap-2 text-xs font-bold text-muted">
                <StarRating value={Math.round(featured.averageRating)} />
                {featured.averageRating.toFixed(1).replace(".", ",")} · {readersLabel(featured)} ce mois-ci
              </div>
            ) : null}
            {featuredReview?.body ? (
              <figure className="flex w-full gap-3 rounded-xl bg-ink p-3.5 sm:p-4">
                <Quote size={18} aria-hidden className="mt-1 shrink-0 text-coral" />
                <div>
                  <blockquote className="text-sm italic leading-relaxed text-paper sm:text-[15px]">« {excerpt(featuredReview.body, false, 220)} »</blockquote>
                  <figcaption className="mt-2 text-xs text-muted">{featuredReview.user.name ?? "Un lecteur"} · avis le plus apprécié</figcaption>
                </div>
              </figure>
            ) : null}
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href={`/books/${featured.id}`} className="bb-btn-primary px-5 py-2.5 text-sm">Voir la fiche</Link>
              <Link href="/signup" className="bb-btn-outline px-5 py-2.5 text-sm">
                <Plus size={16} aria-hidden />
                Créer un compte pour l&apos;ajouter
              </Link>
            </div>
            <p className="hidden text-xs text-muted sm:block">Sans compte, tu peux chercher et lire les fiches. Pour noter et suivre tes lectures, il faut un compte.</p>
          </div>
          {recentReaders.length ? (
            <div className="flex flex-col gap-3 md:col-span-2 lg:col-span-1">
              <p className="text-sm font-bold text-paper">Ils l&apos;ont lu récemment</p>
              <div className="flex -space-x-2">
                {recentReaders.map((entry) => (
                  <Avatar key={entry.id} name={entry.user.name} image={entry.user.image} size={34} className="border-2 border-panel" />
                ))}
              </div>
              {readerCount > recentReaders.length ? (
                <p className="text-xs text-muted">et {plural(readerCount - recentReaders.length, "autre lecteur", "autres lecteurs")}</p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-6 rounded bg-gradient-to-br from-mint to-[#9a4a3e] p-5 text-ink sm:gap-8 sm:p-10 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="flex flex-col items-start gap-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0b48f]">Pourquoi BooksBox ?</p>
          <h2 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">Ton carnet de lecture, partagé avec d&apos;autres lecteurs.</h2>
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <Link href="/signup" className="bb-btn bg-ink px-5 py-2.5 text-sm text-mint hover:bg-panel">Créer mon compte</Link>
            <Link href="/login" className="text-sm font-extrabold hover:underline">J&apos;ai déjà un compte</Link>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
          {[
            { icon: BookHeart, title: "Suis tes lectures", text: "Ta bibliothèque, tes livres en cours et la page où tu t'es arrêté." },
            { icon: Star, title: "Note et donne ton avis", text: "Une note, une review, des alertes spoiler pour ne rien gâcher aux autres." },
            { icon: MessageSquareText, title: "Discute avec tes amis", text: "Suis des lecteurs, commente leurs reviews et découvre ce qu'ils lisent." }
          ].map((item) => (
            <div key={item.title} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-1 rounded-xl border border-ink/10 bg-ink/10 p-4 sm:flex sm:flex-col sm:gap-3 sm:p-5">
              <span className="row-span-2 grid h-9 w-9 place-items-center rounded-full bg-ink text-mint">
                <item.icon size={18} aria-hidden />
              </span>
              <h3 className="font-display text-base font-semibold sm:text-lg">{item.title}</h3>
              <p className="text-sm leading-relaxed text-ink/80">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="tendances" className="min-w-0">
        <SectionHeader as="h2" eyebrow="Rayon actif" title="Tendances" description="Les livres qui circulent le plus dans la communauté." />
        {trending.length > 1 ? (
          <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:gap-5 lg:grid-cols-6">
            {trending.slice(1, 7).map((book) => (
              <Link key={book.id} href={`/books/${book.id}`} className="group flex min-w-0 flex-col gap-2">
                <BookCover title={book.title} thumbnailUrl={book.thumbnailUrl} showTitle className="aspect-[2/3] w-full shadow-poster transition group-hover:-translate-y-1" iconSize={20} />
                <span className="bb-label hidden pt-1 text-mint sm:block">Tendance</span>
                <span className="truncate pt-1 font-display text-[13px] font-semibold text-paper sm:pt-0 sm:text-[15px]">{book.title}</span>
                <span className="-mt-1.5 truncate text-xs text-muted">{book.authors[0]}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Les tendances apparaîtront dès que la communauté lira.</p>
        )}
      </section>
    </div>
  );
}
