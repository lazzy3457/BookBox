import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { BookOpen } from "lucide-react";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getBookDetails } from "@/server/services/books";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { LibraryActions } from "@/components/library/LibraryActions";
import { FavoriteButton } from "@/components/library/FavoriteButton";
import { ReviewComposer } from "@/components/reviews/ReviewComposer";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { AddToListButton } from "@/components/lists/AddToListButton";

export const dynamic = "force-dynamic";

export default async function BookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;

  const [book, session] = await Promise.all([
    getBookDetails(bookId),
    getServerSession(authOptions),
  ]);

  if (!book) notFound();

  const userBook = session?.user?.id
    ? await prisma.userBook.findUnique({
        where: { userId_bookId: { userId: session.user.id, bookId: book.id } },
      })
    : null;

  const currentLibraryEntry = session?.user?.id
    ? book.libraries.find((entry) => entry.userId === session.user?.id)
    : null;
  const currentUserReview = session?.user?.id
    ? book.reviews.find((review) => review.userId === session.user?.id)
    : null;

  return (
    <div>
      <section className="relative mb-8 overflow-hidden rounded border border-line bg-gradient-to-br from-slateCard via-panel to-ink p-6 shadow-poster">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-mint via-sky to-coral" />
        <div className="grid gap-7 xl:grid-cols-[250px_1fr_320px]">
          <div className="cover-sheen grid aspect-[2/3] place-items-center overflow-hidden rounded border border-line bg-panelSoft shadow-poster">
            {book.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={book.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <BookOpen size={64} className="text-white/25" />
            )}
          </div>
          <div className="self-end">
            <div className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-mint">Fiche livre</div>
            <h1 className="max-w-3xl text-5xl font-black leading-none text-paper">{book.title}</h1>
            <p className="mt-4 text-lg font-bold text-muted">{book.authors.join(", ") || "Auteur inconnu"}</p>
            {book.description && (
              <p className="mt-5 line-clamp-5 max-w-3xl leading-7 text-white/65">{book.description}</p>
            )}
          </div>
          <div className="self-end rounded border border-line bg-ink/55 p-4">
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-muted">Bibliothèque</h2>
            <LibraryActions bookId={book.id} />
            {userBook && (
              <FavoriteButton bookId={book.id} initial={userBook.isFavorite} />
            )}
            {session?.user?.id && (
              <AddToListButton bookId={book.id} />
            )}
          </div>
        </div>
      </section>

      <SectionHeader eyebrow="Détails" title="Métadonnées et discussions" description="Une fiche pensée comme une page média : information rapide, action directe, reviews sociales." />

      <div className="grid gap-8 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <div className="rounded border border-line bg-panel/75 p-5">
            <div className="space-y-5 text-sm text-muted">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.16em] text-muted/70">Publication</div>
                <div className="mt-1 font-bold text-paper">{book.publishedDate ?? "Inconnue"}</div>
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-[0.16em] text-muted/70">Pages</div>
                <div className="mt-1 font-bold text-paper">{book.pageCount ?? "Inconnu"}</div>
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-[0.16em] text-muted/70">Source</div>
                <div className="mt-1 font-bold text-paper">{book.source}</div>
              </div>
            </div>
          </div>
        </aside>

        <section className="space-y-6">
          <ReviewComposer bookId={book.id} hasUserReview={Boolean(currentUserReview)} />
          <div>
            <h2 className="mb-4 text-xl font-black text-paper">Reviews</h2>
            <div className="space-y-4">
              {book.reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={{
                    id: review.id,
                    rating: review.rating,
                    body: review.body,
                    spoiler: review.spoiler,
                    userName: review.user.name ?? "Lecteur BooksBox",
                    canManage: review.userId === session?.user?.id,
                    reactionsCount: review.reactions.length,
                    comments: review.comments.map((comment) => ({
                      id: comment.id,
                      body: comment.body,
                      userName: comment.user.name ?? "Lecteur BooksBox",
                      canManage: comment.userId === session?.user?.id,
                      createdAt: comment.createdAt.toISOString(),
                      likesCount: comment.likes.length
                    }))
                  }}
                />
              ))}
              {!book.reviews.length && (
                <div className="rounded border border-line bg-panel/65 p-6 text-sm text-muted">
                  Aucune review pour ce livre. La première a souvent un petit goût de privilège.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
