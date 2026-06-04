import Link from "next/link";
import { BookMarked, MessageSquareText } from "lucide-react";

type ActivityRowProps = {
  type: "review" | "library";
  userName: string;
  bookId: string;
  bookTitle: string;
  detail: string;
};

export function ActivityRow({ type, userName, bookId, bookTitle, detail }: ActivityRowProps) {
  const Icon = type === "review" ? MessageSquareText : BookMarked;

  return (
    <div className="flex items-center gap-4 border-b border-line/70 bg-panel/30 px-1 py-4 transition hover:bg-panel/80">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded border border-line bg-panelSoft text-mint">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-muted">
          <span className="font-bold text-paper">{userName}</span> {detail}
        </p>
        <Link href={`/books/${bookId}`} className="mt-1 block truncate text-sm font-bold text-mint">
          {bookTitle}
        </Link>
      </div>
    </div>
  );
}
