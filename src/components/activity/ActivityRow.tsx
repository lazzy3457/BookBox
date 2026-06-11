import Link from "next/link";

type ActivityRowProps = {
  type: "review" | "library";
  userId: string;
  userName: string;
  userImage?: string | null;
  bookId: string;
  bookTitle: string;
  detail: string;
};

export function ActivityRow({ userId, userName, userImage, bookId, bookTitle, detail }: ActivityRowProps) {
  const initial = userName.slice(0, 1).toUpperCase();

  return (
    <div className="flex w-full min-w-0 max-w-full items-center gap-3 overflow-hidden border-b border-line/70 bg-panel/30 px-1 py-4 transition hover:bg-panel/80 sm:gap-4">
      <Link
        href={`/profile/${userId}`}
        className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded border border-line bg-mint text-sm font-black text-ink transition hover:border-mint/70 hover:opacity-90"
        aria-label={`Voir le profil de ${userName}`}
      >
        {userImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={userImage} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-muted">
          <Link href={`/profile/${userId}`} className="font-bold text-paper transition hover:text-mint">
            {userName}
          </Link>{" "}
          {detail}
        </p>
        <Link href={`/books/${bookId}`} className="mt-1 block truncate text-sm font-bold text-mint">
          {bookTitle}
        </Link>
      </div>
    </div>
  );
}
