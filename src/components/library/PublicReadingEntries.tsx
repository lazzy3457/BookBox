import Link from "next/link";
import { CalendarDays } from "lucide-react";

export function PublicReadingEntries({ entries }: {
  entries: Array<{
    id: string;
    entryDate: Date;
    page: number | null;
    percentage: number | null;
    chapter: string | null;
    note: string | null;
    period: { userBook: { book: { id: string; title: string } } };
  }>;
}) {
  if (!entries.length) return null;
  return (
    <section className="mt-9">
      <h2 className="mb-4 text-xl font-black text-paper">Journal public</h2>
      <div className="grid gap-3 xl:grid-cols-2">
        {entries.map((entry) => (
          <article key={entry.id} className="rounded border border-line bg-panel/80 p-4">
            <Link href={`/books/${entry.period.userBook.book.id}`} className="font-black text-paper hover:text-mint">{entry.period.userBook.book.title}</Link>
            <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-muted">
              <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{entry.entryDate.toLocaleDateString("fr-FR")}</span>
              <span>{[entry.page ? `p. ${entry.page}` : null, entry.percentage != null ? `${entry.percentage}%` : null, entry.chapter].filter(Boolean).join(" · ")}</span>
            </div>
            {entry.note ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{entry.note}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
