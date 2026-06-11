"use client";

import { FormEvent, useState } from "react";
import { Search, UsersRound } from "lucide-react";
import { CommunityReader, CommunityUserCard } from "@/components/community/CommunityUserCard";

type CommunityReaderSearchProps = {
  initialReaders: CommunityReader[];
  canFollow: boolean;
};

type SearchPayload = {
  readers: CommunityReader[];
};

export function CommunityReaderSearch({ initialReaders, canFollow }: CommunityReaderSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommunityReader[]>(initialReaders);
  const [status, setStatus] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function searchReaders(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      setHasSearched(false);
      setResults(initialReaders);
      setStatus("Entre au moins 2 caracteres pour chercher un lecteur.");
      return;
    }

    setIsSearching(true);
    setStatus("");

    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(normalizedQuery)}`);
      const payload = (await response.json()) as SearchPayload & { error?: { message?: string } };

      if (!response.ok) {
        setStatus("La recherche de lecteurs ne repond pas pour le moment.");
        return;
      }

      setHasSearched(true);
      setResults(payload.readers);
      setStatus(payload.readers.length ? "" : "Aucun lecteur trouve avec cette recherche.");
    } finally {
      setIsSearching(false);
    }
  }

  function resetSearch() {
    setQuery("");
    setHasSearched(false);
    setResults(initialReaders);
    setStatus("");
  }

  return (
    <section>
      <div className="mb-5 rounded border border-line bg-panel/75 p-4 shadow-poster">
        <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-muted">
          <UsersRound size={14} />
          Trouver des amis
        </div>
        <form onSubmit={searchReaders} className="grid gap-3 sm:flex">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-12 flex-1 rounded border border-line bg-ink px-4 text-white outline-none transition placeholder:text-muted/45 focus:border-mint"
            placeholder="Pseudo, nom ou email"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="inline-flex h-12 items-center justify-center gap-2 rounded bg-mint px-5 font-black text-ink transition hover:bg-lime disabled:cursor-default disabled:bg-panelSoft disabled:text-muted"
          >
            <Search size={18} />
            {isSearching ? "Recherche..." : "Trouver"}
          </button>
        </form>
        {hasSearched ? (
          <button
            type="button"
            onClick={resetSearch}
            className="mt-3 text-xs font-bold text-muted transition hover:text-paper"
          >
            Revenir a la selection de lecteurs
          </button>
        ) : null}
        {status ? <p className="mt-3 text-sm text-muted">{status}</p> : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {results.map((reader) => (
          <CommunityUserCard key={reader.id} reader={reader} canFollow={canFollow} />
        ))}
      </div>
      {!results.length && !status ? (
        <div className="rounded border border-line bg-panel/65 p-6 text-sm text-muted">
          Aucun lecteur a afficher pour le moment.
        </div>
      ) : null}
    </section>
  );
}
