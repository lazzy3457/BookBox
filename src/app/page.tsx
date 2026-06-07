import Link from "next/link";
import { getServerSession } from "next-auth";
import { BookOpenCheck, Search } from "lucide-react";
import { authOptions } from "@/server/auth/options";
import { getFriendActivity } from "@/server/services/feed";
import { getTrendingBooks } from "@/server/services/trending";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BookCard } from "@/components/books/BookCard";
import { CoverShelf } from "@/components/books/CoverShelf";
import { ActivityRow } from "@/components/activity/ActivityRow";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const [trending, activity] = await Promise.all([
    getTrendingBooks(),
    session?.user?.id ? getFriendActivity(session.user.id) : Promise.resolve([])
  ]);

  return (
    <div>
      <section className="relative overflow-hidden rounded border border-line bg-gradient-to-br from-panel via-night to-ink p-8 shadow-poster">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-mint via-amber to-coral" />
        <div className="grid gap-10 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col justify-between">
            <div>
              <div className="mb-4 inline-flex rounded bg-mint/12 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-mint">
                BooksBox V1 desktop
              </div>
              <h1 className="max-w-4xl text-6xl font-black leading-[0.96] tracking-normal text-paper">
                Ton carnet de lecture devient un mur de couvertures vivant.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
                Recherche, note, classe et découvre les lectures de ton cercle avec une interface sombre,
                dense et visuelle pensée pour le bureau.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/search" className="inline-flex items-center gap-2 rounded bg-mint px-5 py-3 font-black text-ink transition hover:bg-lime">
                <Search size={18} />
                J'ai fini un livre
              </Link>
              <Link href="/trending" className="inline-flex items-center gap-2 rounded border border-line bg-ink/35 px-5 py-3 font-bold text-muted transition hover:text-paper">
                Voir tendance
              </Link>
            </div>
          </div>

          <div>
            <CoverShelf />
            <div className="mt-4 rounded border border-line bg-ink/55 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded bg-mint text-ink">
                  <BookOpenCheck size={20} />
                </div>
                <div>
                  <div className="text-sm font-black text-paper">Boucle critique</div>
                  <div className="text-xs text-muted">{"Recherche -> Lu -> Note -> Review"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <SectionHeader
          eyebrow="Rayon actif"
          title="Couvertures qui circulent"
          description="Quand la base se remplit, cette zone devient une étagère de livres populaires et récemment commentés."
        />
        {trending.length ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
            {trending.slice(0, 8).map((book) => (
              <BookCard key={book.id} book={book} href={`/books/${book.id}`} badge="Hot" showScore={false} variant="poster" />
            ))}
          </div>
        ) : (
          <div className="rounded border border-line bg-panel/65 p-5">
            <CoverShelf />
          </div>
        )}
      </section>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_420px]">
        <section>
          <SectionHeader
            eyebrow="Social"
            title="Activité des amis"
            description={session ? "Les reviews et statuts des personnes suivies." : "Connecte-toi pour voir ton feed personnalisé."}
          />
          <div className="space-y-3">
            {activity.length ? (
              activity.map((item) =>
                item.type === "review" ? (
                  <ActivityRow
                    key={item.id}
                    type="review"
                    userName={item.review.user.name ?? "Un lecteur"}
                    bookId={item.review.bookId}
                    bookTitle={item.review.book.title}
                    detail={`a publié une review ${item.review.rating}/5`}
                  />
                ) : (
                  <ActivityRow
                    key={item.id}
                    type="library"
                    userName={item.entry.user.name ?? "Un lecteur"}
                    bookId={item.entry.bookId}
                    bookTitle={item.entry.book.title}
                    detail={`a marqué ce livre en ${item.entry.status}`}
                  />
                )
              )
            ) : (
              <div className="rounded border border-line bg-panel/65 p-6 text-sm text-muted">
                Aucun événement pour l'instant. Le feed prendra vie dès que tu suis des lecteurs.
              </div>
            )}
          </div>
        </section>

        <section>
          <SectionHeader eyebrow="Découverte" title="Tendance" />
          <div className="space-y-4">
            {trending.length ? (
              trending.slice(0, 4).map((book) => (
                <BookCard key={book.id} book={book} href={`/books/${book.id}`} badge="30 jours" compact showScore={false} />
              ))
            ) : (
              <div className="rounded border border-line bg-panel/65 p-6 text-sm text-muted">
                Les tendances apparaîtront après les premiers ajouts et reviews.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
