import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BookCard } from "@/components/books/BookCard";
import { ListCard } from "@/components/lists/ListCard";
import { EditProfileButton } from "@/components/profile/EditProfileButton";
import { StarRating } from "@/components/reviews/StarRating";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <div className="rounded border border-line bg-panel/75 p-5 sm:p-8">
        <h1 className="text-2xl font-black text-paper">Profil lecteur</h1>
        <p className="mt-3 text-muted">Connecte-toi pour voir ton profil.</p>
        <Link href="/login" className="mt-5 inline-block rounded bg-mint px-5 py-3 font-black text-ink">
          Connexion
        </Link>
      </div>
    );
  }

  const [user, libraryCount, reviewCount, followerCount, followingCount, recentBooks, recentReviews, favorites, lists] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.userBook.count({ where: { userId: session.user.id } }),
    prisma.review.count({ where: { userId: session.user.id } }),
    prisma.follow.count({ where: { followingId: session.user.id } }),
    prisma.follow.count({ where: { followerId: session.user.id } }),
    prisma.userBook.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: { book: true },
    }),
    prisma.review.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { book: true, reactions: true, comments: true },
    }),
    prisma.userBook.findMany({
      where: { userId: session.user.id, isFavorite: true },
      orderBy: { updatedAt: "desc" },
      include: { book: true },
    }),
    prisma.bookList.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        entries: {
          orderBy: { order: "asc" },
          take: 5,
          include: { book: { select: { thumbnailUrl: true, title: true } } },
        },
        _count: { select: { entries: true } },
      },
    }),
  ]);

  return (
    <div className="min-w-0 overflow-hidden">
      {/* Header profil */}
        <section className="mb-8 min-w-0 overflow-hidden rounded border border-line bg-gradient-to-br from-slateCard via-panel to-ink shadow-poster">
          <div className="h-28 bg-gradient-to-r from-mint/40 via-sky/35 to-coral/40" />
          <div className="grid min-w-0 gap-4 px-4 pb-5 sm:flex sm:items-end sm:gap-6 sm:px-7 sm:pb-7">
            <div className="-mt-12 h-24 w-24 shrink-0 overflow-hidden rounded border-4 border-panel bg-ink sm:h-28 sm:w-28">
              {user?.image ? (
                <img src={user.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-4xl font-black text-mint">
                  {(user?.name ?? "B").slice(0, 1)}
                </div>
              )}
            </div>
            <div className="grid min-w-0 flex-1 gap-4 pb-1 sm:flex sm:items-end sm:justify-between">
              <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-mint">Profil lecteur</div>
                <h1 className="mt-2 text-3xl font-black leading-tight text-paper sm:text-4xl">{user?.name ?? "Lecteur BooksBox"}</h1>
                <p className="mt-2 text-sm text-muted">{user?.bio ?? "Profil simple V1 avec stats de lecture."}</p>
              </div>
              <EditProfileButton user={{ name: user?.name ?? null, bio: user?.bio ?? null, image: user?.image ?? null }} />
            </div>
          </div>
        </section>

      {/* Favoris */}
      {favorites.length > 0 && (
        <section className="mb-8">
          <SectionHeader
            eyebrow="Coups de cœur"
            title="Mes favoris"
            description="Les livres que tu as marqués comme coups de cœur."
          />
          <div className="grid min-w-0 grid-cols-1 gap-4 min-[360px]:grid-cols-2 md:grid-cols-4 md:gap-5 xl:grid-cols-6 2xl:grid-cols-10">
            {favorites.map((entry) => (
              <BookCard key={entry.id} book={entry.book} href={`/books/${entry.bookId}`} variant="poster" />
            ))}
          </div>
        </section>
      )}

      {/* Stats */}
      <SectionHeader eyebrow="Stats" title="Activité" />
      <div className="grid min-w-0 gap-4 xl:grid-cols-4">
        {[
          ["Livres", libraryCount],
          ["Reviews", reviewCount],
          ["Followers", followerCount],
          ["Abonnements", followingCount],
        ].map(([label, value]) => (
          <div key={label} className="rounded border border-line bg-panel/80 p-5 shadow-poster">
            <div className="text-sm text-muted">{label}</div>
            <div className="mt-2 text-3xl font-black text-paper">{value}</div>
          </div>
        ))}
      </div>

      {/* Listes */}
      <section className="mt-9 min-w-0 overflow-hidden">
        <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
          <SectionHeader
            eyebrow="Collections"
            title="Mes listes"
            description="Tes sagas, thématiques et sélections personnelles."
          />
          <Link
            href="/lists/new"
            className="shrink-0 rounded border border-line bg-panel/60 px-4 py-2 text-xs font-black text-muted transition hover:border-mint/50 hover:text-mint"
          >
            + Nouvelle liste
          </Link>
        </div>
        {lists.length > 0 ? (
          <div className="grid min-w-0 grid-cols-1 gap-4 min-[360px]:grid-cols-2 md:grid-cols-3 md:gap-5 xl:grid-cols-4">
            {lists.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
          </div>
        ) : (
          <div className="rounded border border-line bg-panel/65 p-6 text-sm text-muted">
            Aucune liste pour le moment.{" "}
            <Link href="/lists/new" className="font-bold text-mint hover:underline">
              Créer ta première liste →
            </Link>
          </div>
        )}
      </section>

      {/* Historique */}
      <section className="mt-9 min-w-0 overflow-hidden">
        <SectionHeader
          eyebrow="Historique"
          title="Derniers livres"
          description="Les livres ajoutes ou mis a jour recemment dans ta bibliotheque."
        />
        {recentBooks.length ? (
          <div className="grid min-w-0 grid-cols-1 gap-4 min-[360px]:grid-cols-2 md:grid-cols-4 md:gap-5 xl:grid-cols-6 2xl:grid-cols-10">
            {recentBooks.map((entry) => (
              <BookCard key={entry.id} book={entry.book} href={`/books/${entry.bookId}`} badge={entry.status} variant="poster" />
            ))}
          </div>
        ) : (
          <div className="rounded border border-line bg-panel/65 p-6 text-sm text-muted">
            Aucun livre dans l'historique pour le moment.
          </div>
        )}
      </section>

  {/* Reviews */}
      <section className="mt-9 min-w-0 overflow-hidden">
        <SectionHeader
          eyebrow="Reviews"
          title="Dernieres reviews"
          description="Tes avis les plus recents, avec reactions et commentaires."
        />
        {recentReviews.length ? (
          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            {recentReviews.map((review) => (
              <Link
                key={review.id}
                href={`/books/${review.bookId}`}
                className="group rounded border border-line bg-panel/80 p-4 shadow-poster transition hover:border-mint/50 hover:bg-panelSoft sm:p-5"
              >
                <div className="flex min-w-0 gap-3 sm:gap-4">
                  <div className="h-24 w-16 shrink-0 overflow-hidden rounded border border-line bg-panelSoft">
                    {review.book.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={review.book.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-sm font-black text-paper group-hover:text-mint transition">
                      {review.book.title}
                    </div>
                    <div className="mt-2">
                      <StarRating value={review.rating} />
                    </div>
                    {review.body ? (
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">
                        {review.spoiler ? "Review marquée comme spoiler." : review.body}
                      </p>
                    ) : null}
                    <div className="mt-3 text-xs font-bold text-muted">
                      {review.reactions.length} réactions · {review.comments.length} commentaires
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded border border-line bg-panel/65 p-6 text-sm text-muted">
            Aucune review publiée pour le moment.
          </div>
        )}
      </section>
    </div>
  );
}
