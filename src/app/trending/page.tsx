import { getTrendingBooks } from "@/server/services/trending";
import { BookCard } from "@/components/books/BookCard";
import { SectionHeader } from "@/components/ui/SectionHeader";

export const dynamic = "force-dynamic";

export default async function TrendingPage() {
  const books = await getTrendingBooks();

  return (
    <div className="min-w-0 overflow-hidden">
      <SectionHeader
        eyebrow="Decouverte"
        title="Livres tendance"
        description="Les livres qui circulent le plus dans la communaute sur les 30 derniers jours."
      />
      <div className="grid min-w-0 grid-cols-1 gap-4 min-[360px]:grid-cols-2 md:grid-cols-4 md:gap-5 xl:grid-cols-6 2xl:grid-cols-8">
        {books.map((book) => (
          <BookCard key={book.id} book={book} href={`/books/${book.id}`} badge="Tendance" showScore={false} variant="poster" />
        ))}
      </div>
      {!books.length ? (
        <div className="rounded border border-line bg-panel/65 p-5 text-sm text-muted sm:p-8">
          Les tendances apparaitront des que la communaute ajoute et review des livres.
        </div>
      ) : null}
    </div>
  );
}
