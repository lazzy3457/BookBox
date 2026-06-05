"use client";

import Link from "next/link";
import { FollowButton } from "@/components/community/FollowButton";

export type CommunityReader = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  isFollowing?: boolean;
  counts: {
    library: number;
    reviews: number;
    followers: number;
  };
};

type CommunityUserCardProps = {
  reader: CommunityReader;
  canFollow?: boolean;
};

export function CommunityUserCard({ reader, canFollow = false }: CommunityUserCardProps) {
  return (
    <article className="rounded border border-line bg-panel/80 p-5 shadow-poster transition hover:border-mint/60 hover:bg-panelSoft">
      <div className="flex items-start justify-between gap-4">
        <Link href={`/profile/${reader.id}`} className="flex min-w-0 flex-1 items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded border border-line bg-ink text-xl font-black text-mint">
            {(reader.name ?? reader.username ?? "B").slice(0, 1)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-black text-paper">{reader.name ?? reader.username ?? "Lecteur BooksBox"}</h2>
            <p className="mt-1 truncate text-xs text-muted">
              {reader.username ? `@${reader.username}` : reader.email ?? "Lecteur BooksBox"}
            </p>
          </div>
        </Link>
        {canFollow ? (
          <div className="shrink-0">
            <FollowButton userId={reader.id} initiallyFollowing={reader.isFollowing} />
          </div>
        ) : null}
      </div>
      <Link
        href={`/profile/${reader.id}`}
        className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold text-muted"
        aria-label={`Voir le profil de ${reader.name ?? reader.username ?? "ce lecteur"}`}
      >
        <div className="rounded bg-ink/55 px-2 py-2">{reader.counts.library} livres</div>
        <div className="rounded bg-ink/55 px-2 py-2">{reader.counts.reviews} reviews</div>
        <div className="rounded bg-ink/55 px-2 py-2">{reader.counts.followers} followers</div>
      </Link>
    </article>
  );
}
