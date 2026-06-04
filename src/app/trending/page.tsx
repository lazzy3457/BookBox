import { getTrendingBooks } from "@/server/services/trending";
import { BookCard } from "@/components/books/BookCard";
import { SectionHeader } from "@/components/ui/SectionHeader";

export const dynamic = "force-dynamic";

export default async function TrendingPage() {
  const books = await getTrendingBooks();

  return (
    <div>
      <SectionHeader
        eyebrow="Découverte"
        title="Livres tendance"
        description="Score V1 sur 30 jours : lectures, envies de lire, reviews et réactions."
      />
      <div className="grid grid-cols-2 gap-5 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
        {books.map((book) => (
          <BookCard key={book.id} book={book} href={`/books/${book.id}`} badge="Tendance" variant="poster" />
        ))}
      </div>
      {!books.length ? (
        <div className="rounded border border-line bg-panel/65 p-8 text-sm text-muted">
          Les tendances apparaîtront dès que la communauté ajoute et review des livres.
        </div>
      ) : null}
    </div>
  );
}
