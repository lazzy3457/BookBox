import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, MessageSquareText, Star, UserRound, UsersRound } from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { slugifyAuthor } from "@/lib/authors";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ExpandableDescription } from "@/components/books/ExpandableDescription";
import { AuthorBookshelf } from "@/components/authors/AuthorBookshelf";
import { AuthorExternalEditions } from "@/components/authors/AuthorExternalEditions";
import { StarRating } from "@/components/reviews/StarRating";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type AuthorSummary = {
  extract?: string;
  thumbnail?: {
    source?: string;
  };
};

export async function generateMetadata({ params }: { params: Promise<{ authorSlug: string }> }): Promise<Metadata> {
  const { authorSlug } = await params;
  const books = await prisma.book.findMany({
    where: { authors: { isEmpty: false } },
    select: { authors: true },
    take: 5000
  });
  const authorName = books.flatMap((book) => book.authors).find((author) => slugifyAuthor(author) === authorSlug);
  if (!authorName) return { title: "Auteur introuvable", robots: { index: false, follow: false } };

  const description = `Découvre les livres, éditions et avis autour de ${authorName} sur BooksBox.`;
  return {
    title: authorName,
    description,
    alternates: { canonical: `/authors/${authorSlug}` },
    openGraph: {
      title: authorName,
      description,
      url: `/authors/${authorSlug}`
    }
  };
}

async function getAuthorSummary(authorName: string) {
  const candidates = [
    `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(authorName)}`,
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(authorName)}`
  ];

  for (const url of candidates) {
    try {
      const response = await fetch(url, { next: { revalidate: 604800 } });

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as AuthorSummary;

      if (payload.extract || payload.thumbnail?.source) {
        return {
          bio: payload.extract ?? null,
          image: payload.thumbnail?.source ?? null
        };
      }
    } catch {
      continue;
    }
  }

  return {
    bio: null,
    image: null
  };
}

export default async function AuthorPage({ params }: { params: Promise<{ authorSlug: string }> }) {
  const { authorSlug } = await params;
  const allAuthorBooks = await prisma.book.findMany({
    where: {
      authors: { isEmpty: false }
    },
    include: {
      libraries: true,
      reviews: {
        where: { hiddenAt: null, user: { suspendedAt: null } },
        include: {
          user: true,
          reactions: true,
          comments: {
            where: { hiddenAt: null, user: { suspendedAt: null } },
            include: { user: true, likes: true },
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  const books = allAuthorBooks.filter((book) => book.authors.some((author) => slugifyAuthor(author) === authorSlug));
  const authorName = books[0]?.authors.find((author) => slugifyAuthor(author) === authorSlug);

  if (!authorName) {
    notFound();
  }

  const authorSummary = await getAuthorSummary(authorName);
  const mappedBooks = books.map((book) => ({
    id: book.id,
    title: book.title,
    authors: book.authors,
    thumbnailUrl: book.thumbnailUrl,
    publishedDate: book.publishedDate,
    averageRating: book.reviews.length
      ? book.reviews.reduce((total, review) => total + review.rating, 0) / book.reviews.length
      : null
  }));
  const allReviews = books.flatMap((book) =>
    book.reviews.map((review) => ({
      ...review,
      book
    }))
  );
  const averageRating = allReviews.length
    ? allReviews.reduce((total, review) => total + review.rating, 0) / allReviews.length
    : null;
  const readerCount = new Set(books.flatMap((book) => book.libraries.map((entry) => entry.userId))).size;
  const mostReadBook = books
    .slice()
    .sort((a, b) => b.libraries.length - a.libraries.length)[0];
  const recentReviews = allReviews
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 4);

  const stats = [
    { label: "Livres", value: books.length, icon: BookOpen },
    { label: "Moyenne", value: averageRating ? averageRating.toFixed(1) : "-", icon: Star },
    { label: "Reviews", value: allReviews.length, icon: MessageSquareText },
    { label: "Lecteurs", value: readerCount, icon: UsersRound }
  ];

  return (
    <div className="min-w-0 overflow-hidden">
      <section className="relative mb-8 min-w-0 overflow-hidden rounded border border-line bg-gradient-to-br from-panel via-night to-ink p-5 shadow-poster sm:p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-mint via-amber to-coral" />
        <div className="grid min-w-0 gap-6 md:grid-cols-[160px_minmax(0,1fr)]">
          <div className="grid aspect-square w-32 place-items-center overflow-hidden rounded border border-line bg-ink/55 shadow-poster md:w-auto">
            {authorSummary.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={authorSummary.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-panelSoft text-muted">
                <UserRound size={58} />
              </div>
            )}
          </div>

          <div className="min-w-0 max-w-4xl self-end">
            <div className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-mint">Auteur</div>
            <h1 className="text-3xl font-black leading-tight text-paper sm:text-4xl xl:text-5xl">{authorName}</h1>
            <ExpandableDescription
              text={
                authorSummary.bio ??
                `Les livres de ${authorName} presents dans BooksBox, avec les notes et discussions de la communaute.`
              }
            />
          </div>
        </div>

        <div className="mt-7 grid min-w-0 grid-cols-1 gap-3 min-[360px]:grid-cols-2 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded border border-line bg-ink/45 px-4 py-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-muted">
                <stat.icon size={13} />
                {stat.label}
              </div>
              <div className="text-2xl font-black text-paper">{stat.value}</div>
            </div>
          ))}
        </div>

        {mostReadBook ? (
          <div className="mt-5 rounded border border-line bg-ink/45 px-4 py-3 text-sm text-muted">
            Livre le plus present dans les bibliotheques :{" "}
            <Link href={`/books/${mostReadBook.id}`} className="font-black text-paper transition hover:text-mint">
              {mostReadBook.title}
            </Link>
          </div>
        ) : null}
      </section>

      <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <section className="min-w-0 overflow-hidden">
          <SectionHeader
            eyebrow="BooksBox"
            title="Livres dans le catalogue"
            description="Les livres deja presents dans BooksBox, avec les notes et lectures de la communaute."
          />
          <AuthorBookshelf books={mappedBooks} />

          <div className="mt-10">
            <SectionHeader
              eyebrow="Sources externes"
              title="Autres livres et editions trouvees"
              description="Editions Google Books et Open Library, paginees et importables une par une."
            />
            <AuthorExternalEditions authorSlug={authorSlug} />
          </div>
        </section>

        <section className="min-w-0 overflow-hidden">
          <SectionHeader eyebrow="Communaute" title="Reviews recentes" />
          <div className="space-y-4">
            {recentReviews.map((review) => (
              <article key={review.id} className="min-w-0 overflow-hidden rounded border border-line bg-panel/82 p-4 shadow-poster">
                <Link href={`/books/${review.book.id}`} className="mb-3 block text-xs font-black uppercase tracking-[0.16em] text-mint transition hover:text-lime">
                  {review.book.title}
                </Link>
                <div className="flex min-w-0 items-start gap-3">
                  <Link
                    href={`/profile/${review.userId}`}
                    className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded bg-mint text-xs font-black text-ink"
                  >
                    {review.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={review.user.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (review.user.name ?? "L").slice(0, 1).toUpperCase()
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/profile/${review.userId}`} className="font-black text-paper transition hover:text-mint">
                        {review.user.name ?? "Lecteur BooksBox"}
                      </Link>
                      <StarRating value={review.rating} />
                    </div>
                    {review.body ? (
                      <p className="mt-3 line-clamp-4 text-sm leading-6 text-white/65">
                        {review.spoiler ? "Cette review contient des spoilers." : review.body}
                      </p>
                    ) : null}
                    <div className="mt-3 text-xs font-bold text-muted">
                      {review.reactions.length} likes · {review.comments.length} commentaires
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {!recentReviews.length ? (
              <div className="rounded border border-line bg-panel/65 p-6 text-sm text-muted">
                Aucune review publiee sur les livres de cet auteur pour le moment.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
