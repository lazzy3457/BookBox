"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toggleFavorite } from "@/server/actions/favorites";

type Props = {
  bookId: string;
  initial: boolean;
};

export function FavoriteButton({ bookId, initial }: Props) {
  const [isFav, setIsFav] = useState(initial);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      setIsFav((prev) => !prev);
      try {
        await toggleFavorite(bookId);
      } catch {
        setIsFav((prev) => !prev); // rollback
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className={`mt-3 flex w-full items-center justify-center gap-2 rounded border px-4 py-2.5 text-sm font-black transition
        ${isFav
          ? "border-amber/60 bg-amber/10 text-amber hover:bg-amber/20"
          : "border-line bg-panel/60 text-muted hover:border-amber/40 hover:text-amber"
        }`}
    >
      <Star size={15} fill={isFav ? "currentColor" : "none"} />
      {isFav ? "Coup de cœur" : "Ajouter aux favoris"}
    </button>
  );
}