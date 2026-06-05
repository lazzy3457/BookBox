import Link from "next/link";
import { Lock, Globe } from "lucide-react";

type Props = {
  list: {
    id: string;
    title: string;
    description: string | null;
    rating: number | null;
    isPublic: boolean;
    entries: {
      book: {
        thumbnailUrl: string | null;
        title: string;
      };
    }[];
    _count: { entries: number };
  };
};

export function ListCard({ list }: Props) {
  const covers = list.entries.slice(0, 5);

  return (
    <Link href={`/lists/${list.id}`} className="group block">
      {/* Stack de couvertures */}
      <div className="relative h-32 w-full overflow-hidden rounded border border-line bg-panelSoft transition group-hover:border-mint/50">
        {covers.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            Aucun livre
          </div>
        ) : (
          <div className="flex h-full gap-0.5">
            {covers.map((entry, i) => (
              <div
                key={i}
                className="relative h-full flex-1 overflow-hidden"
                style={{ opacity: 1 - i * 0.12 }}
              >
                {entry.book.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.book.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-slateCard to-ink" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Badge note */}
        {list.rating != null && (
          <div className="absolute bottom-2 right-2 rounded bg-ink/80 px-2 py-0.5 text-xs font-black text-amber backdrop-blur-sm">
            {list.rating}/5
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="mt-3">
        <div className="flex items-center gap-1.5">
          {list.isPublic
            ? <Globe size={11} className="shrink-0 text-muted/60" />
            : <Lock size={11} className="shrink-0 text-muted/60" />
          }
          <h3 className="line-clamp-1 text-sm font-black text-paper group-hover:text-mint transition">
            {list.title}
          </h3>
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {list._count.entries} livre{list._count.entries !== 1 ? "s" : ""}
        </p>
        {list.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted/70">
            {list.description}
          </p>
        )}
      </div>
    </Link>
  );
}