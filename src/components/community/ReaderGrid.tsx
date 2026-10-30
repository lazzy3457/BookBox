"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import type { ReaderCard } from "@/server/services/community";
import { Avatar } from "@/components/ui/Avatar";
import { BookCover } from "@/components/books/BookCover";
import { FollowButton } from "@/components/community/FollowButton";
import { genreLabel } from "@/lib/genres";
import { daysAgo, plural } from "@/lib/format";

type Filter = "taste" | "active" | "same" | "new";

const filterLabels: Record<Filter, string> = {
  taste: "Goûts proches",
  active: "Actifs cette semaine",
  same: "Lisent le même livre que toi",
  new: "Nouveaux lecteurs"
};

const filterCaptions: Record<Filter, string> = {
  taste: "Classés par livres en commun avec ta bibliothèque",
  active: "Lecteurs actifs ces 7 derniers jours",
  same: "Ils lisent en ce moment un livre que tu lis aussi",
  new: "Les derniers arrivés sur BooksBox"
};

type ReaderGridProps = {
  readers: ReaderCard[];
  canFollow: boolean;
  variant: "suggestions" | "following" | "followers";
  initialQuery?: string;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function ReaderGrid({ readers, canFollow, variant, initialQuery = "" }: ReaderGridProps) {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<Filter>("taste");
  const [remote, setRemote] = useState<ReaderCard[] | null>(null);
  const [searching, setSearching] = useState(false);

  const visible = useMemo(() => {
    const terms = normalize(query.trim());
    let list = readers.filter((reader) =>
      !terms || normalize([reader.name, reader.username ?? "", reader.currentBook?.title ?? ""].join(" ")).includes(terms)
    );
    if (variant !== "suggestions") {
      return [...list].sort((a, b) => (b.lastActiveAt ?? "").localeCompare(a.lastActiveAt ?? ""));
    }
    const weekAgo = daysAgo(7).toISOString();
    if (filter === "active") list = list.filter((reader) => (reader.lastActiveAt ?? "") >= weekAgo);
    if (filter === "same") list = list.filter((reader) => reader.readsSameAsViewer);
    return [...list].sort((a, b) =>
      filter === "new" ? b.joinedAt.localeCompare(a.joinedAt) : filter === "active" ? (b.lastActiveAt ?? "").localeCompare(a.lastActiveAt ?? "") : b.commonCount - a.commonCount
    );
  }, [filter, query, readers, variant]);

  // Au-delà des suggestions chargées, on interroge tout l'annuaire des lecteurs.
  async function searchEveryone(event: React.FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (variant !== "suggestions" || value.length < 2) return;
    setSearching(true);
    const response = await fetch(`/api/users/search?q=${encodeURIComponent(value)}`);
    setSearching(false);
    if (!response.ok) return;
    const payload = await response.json();
    setRemote(
      (payload.readers ?? []).map((reader: { id: string; name: string | null; username: string | null; isFollowing?: boolean; counts?: { library?: number } }) => ({
        id: reader.id,
        name: reader.name ?? reader.username ?? "Lecteur",
        username: reader.username,
        image: null,
        bookCount: reader.counts?.library ?? 0,
        commonCount: 0,
        currentBook: null,
        genres: [],
        isFollowing: Boolean(reader.isFollowing),
        lastActiveAt: null,
        joinedAt: "",
        readsSameAsViewer: false
      }))
    );
  }

  const list = remote ?? visible;
  const placeholder = variant === "suggestions" ? "Pseudo, nom ou livre qu'il lit…" : variant === "following" ? "Chercher dans mes abonnements" : "Chercher dans mes abonnés";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <form onSubmit={searchEveryone} className="flex w-full items-center gap-2 rounded-full border border-line bg-panel px-4 py-2.5 shadow-poster lg:w-[440px]">
          <Search size={16} aria-hidden className="text-muted" />
          <label htmlFor={`reader-search-${variant}`} className="sr-only">{placeholder}</label>
          <input
            id={`reader-search-${variant}`}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setRemote(null);
            }}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent text-sm text-paper outline-none placeholder:text-muted"
          />
          {searching ? <span className="text-xs text-muted">…</span> : null}
        </form>
        {variant === "suggestions" ? (
          <div className="bb-chip-row">
            {(Object.keys(filterLabels) as Filter[]).map((key) => (
              <button key={key} type="button" onClick={() => { setFilter(key); setRemote(null); }} className={`bb-chip ${filter === key ? "bb-chip-active" : ""}`}>
                {filterLabels[key]}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <p className="text-xs text-muted">
        {remote
          ? `${plural(remote.length, "lecteur")} pour « ${query.trim()} »`
          : variant === "suggestions"
            ? filterCaptions[filter]
            : variant === "following"
              ? `Tu suis ${plural(readers.length, "lecteur")} · triés par activité récente`
              : `${plural(readers.length, "lecteur")} te suivent · triés par activité récente`}
      </p>

      {list.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {list.map((reader) => (
            <article key={reader.id} className="bb-card flex flex-col gap-3 p-4">
              <Link href={`/profile/${reader.id}`} className="flex items-center gap-3">
                <Avatar name={reader.name} image={reader.image} size={44} />
                <span className="min-w-0">
                  <span className="block truncate font-display text-base font-semibold text-paper hover:text-mint">{reader.name}</span>
                  <span className="block truncate text-xs text-muted">{[reader.username ? `@${reader.username}` : null, plural(reader.bookCount, "livre")].filter(Boolean).join(" · ")}</span>
                </span>
              </Link>
              {reader.commonCount > 0 ? (
                <p className="flex items-center gap-2 rounded-xl bg-mint/[0.06] px-3 py-2 text-xs font-bold text-mint">
                  <Sparkles size={13} aria-hidden />
                  {plural(reader.commonCount, "livre")} en commun avec toi
                </p>
              ) : null}
              {reader.currentBook ? (
                <Link href={`/books/${reader.currentBook.id}`} className="flex items-center gap-3">
                  <BookCover title={reader.currentBook.title} thumbnailUrl={reader.currentBook.thumbnailUrl} className="h-12 w-8 rounded-md" iconSize={0} />
                  <span className="min-w-0">
                    <span className="bb-label block text-muted">Lit en ce moment</span>
                    <span className="block truncate font-display text-sm font-semibold text-paper">{reader.currentBook.title}</span>
                  </span>
                </Link>
              ) : null}
              {reader.genres.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {reader.genres.map((genre) => (
                    <span key={genre} className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold text-muted">{genreLabel(genre)}</span>
                  ))}
                </div>
              ) : null}
              {canFollow ? (
                <div className="mt-auto pt-1">
                  <FollowButton userId={reader.id} initiallyFollowing={reader.isFollowing} size="block" />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="bb-card-flat p-6 text-sm text-muted">Aucun lecteur ne correspond pour l&apos;instant.</div>
      )}
    </div>
  );
}
