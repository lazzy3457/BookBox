"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { GroupCard } from "@/components/groups/GroupCard";
import { CreateGroupButton } from "@/components/groups/CreateGroupDialog";
import type { DirectoryGroup } from "@/server/services/groupDirectory";

type Filter = "forYou" | "book" | "genre" | "readalong" | "active";

const filters: Array<[Filter, string]> = [
  ["forYou", "Pour toi"],
  ["book", "Autour d'un livre"],
  ["genre", "Par genre"],
  ["readalong", "Lectures communes"],
  ["active", "Les plus actifs"]
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function GroupsTab({ mine, discover, isSignedIn }: { mine: DirectoryGroup[]; discover: DirectoryGroup[]; isSignedIn: boolean }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("forYou");

  const visible = useMemo(() => {
    const terms = normalize(query.trim());
    let list = discover.filter((group) =>
      !terms || normalize([group.name, group.description ?? "", group.topicLabel ?? "", group.bookTitle ?? ""].join(" ")).includes(terms)
    );
    if (filter === "book") list = list.filter((group) => group.topic === "BOOK");
    if (filter === "genre") list = list.filter((group) => group.topic === "GENRE");
    if (filter === "readalong") list = list.filter((group) => group.hasReadalong);
    return [...list].sort((a, b) => {
      if (a.invited !== b.invited) return a.invited ? -1 : 1;
      if (filter === "active") return b.weeklyPosts - a.weeklyPosts;
      return b.affinity - a.affinity || b.memberCount - a.memberCount;
    });
  }, [discover, filter, query]);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {isSignedIn ? (
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="bb-h2">Mes groupes</h2>
          {isSignedIn ? <CreateGroupButton /> : null}
        </div>
        {mine.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {mine.map((group) => <GroupCard key={group.id} group={group} isSignedIn={isSignedIn} />)}
          </div>
        ) : (
          <p className="bb-card-flat p-5 text-sm text-muted">Tu ne fais partie d&apos;aucun groupe. Rejoins-en un ci-dessous ou crée le tien.</p>
        )}
      </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="bb-h2">Découvrir des groupes</h2>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="flex w-full items-center gap-2 rounded-full border border-line bg-panel px-4 py-2.5 lg:w-80">
            <Search size={15} aria-hidden className="text-muted" />
            <span className="sr-only">Chercher un groupe</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Chercher un groupe, un livre, un genre…" className="min-w-0 flex-1 bg-transparent text-sm text-paper outline-none placeholder:text-muted" />
          </label>
          <div className="flex flex-wrap gap-2">
            {filters.map(([value, label]) => (
              <button key={value} type="button" onClick={() => setFilter(value)} className={`bb-chip ${filter === value ? "bb-chip-active" : ""}`}>{label}</button>
            ))}
          </div>
        </div>
        {visible.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {visible.map((group) => (
              <div key={group.id} className="relative">
                {group.invited ? <span className="absolute right-3 top-3 z-10 rounded-full bg-panel px-2.5 py-1 text-[11px] font-extrabold text-mint shadow-poster">Tu es invité</span> : null}
                <GroupCard group={group} isSignedIn={isSignedIn} />
              </div>
            ))}
          </div>
        ) : (
          <p className="bb-card-flat p-5 text-sm text-muted">Aucun groupe ne correspond. Et si tu créais le premier ?</p>
        )}
      </section>
    </div>
  );
}
