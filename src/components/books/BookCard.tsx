import Link from "next/link";
import { BookOpen, Star } from "lucide-react";

export type BookCardBook = {
  id?: string;
  title: string;
  authors: string[];
  thumbnailUrl?: string | null;
  publishedDate?: string | null;
  score?: number;
};

type BookCardProps = {
  book: BookCardBook;
  href?: string;
  badge?: string;
  compact?: boolean;
  variant?: "poster" | "row";
};

export function BookCard({ book, href, badge, compact, variant = "row" }: BookCardProps) {
  const poster = (
    <div className="group">
      <div className="cover-sheen aspect-[2/3] overflow-hidden rounded border border-line bg-panel shadow-poster transition group-hover:-translate-y-1 group-hover:border-mint/70">
        {book.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col justify-between bg-gradient-to-br from-slateCard via-panel to-ink p-4">
            <BookOpen className="text-mint/60" />
            <div>
              <div className="line-clamp-4 text-base font-black leading-tight text-paper">{book.title}</div>
              <div className="mt-2 h-1 w-10 rounded bg-mint" />
            </div>
          </div>
        )}
      </div>
      <div className="mt-3">
        {badge ? <div className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-mint">{badge}</div> : null}
        <h3 className="line-clamp-2 text-sm font-black leading-tight text-paper">{book.title}</h3>
        <p className="mt-1 line-clamp-1 text-xs text-muted">{book.authors.join(", ") || "Auteur inconnu"}</p>
        {typeof book.score === "number" ? (
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-black text-amber">
            <Star size={13} fill="currentColor" />
            {book.score}
          </div>
        ) : null}
      </div>
    </div>
  );

  const content = (
    <div className="group h-full rounded border border-line bg-panel/92 p-4 transition hover:border-mint/60 hover:bg-panelSoft hover:shadow-glow">
      <div className="flex gap-4">
        <div className="cover-sheen grid h-36 w-24 shrink-0 place-items-center overflow-hidden rounded border border-line bg-panelSoft shadow-poster">
          {book.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <BookOpen className="text-white/30" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {badge ? <div className="mb-2 inline-flex rounded bg-mint/10 px-2 py-1 text-xs font-black text-mint">{badge}</div> : null}
          <h3 className="line-clamp-2 text-lg font-black leading-tight text-paper">{book.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-muted">{book.authors.join(", ") || "Auteur inconnu"}</p>
          {book.publishedDate ? <p className="mt-3 text-xs text-muted/70">{book.publishedDate}</p> : null}
          {typeof book.score === "number" ? (
            <div className="mt-4 inline-flex items-center gap-1 rounded bg-amber/15 px-2 py-1 text-xs font-bold text-amber">
              <Star size={14} />
              {book.score} tendance
            </div>
          ) : null}
        </div>
      </div>
      {!compact ? <div className="mt-4 h-px bg-line transition group-hover:bg-mint/30" /> : null}
    </div>
  );

  const body = variant === "poster" ? poster : content;

  if (!href) {
    return body;
  }

  return <Link href={href}>{body}</Link>;
}
