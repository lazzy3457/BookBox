"use client";

import { useState } from "react";
import { ListPlus } from "lucide-react";
import { AddToListModal } from "./AddToListModal";

type Props = {
  bookId: string;
};

export function AddToListButton({ bookId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded border border-line bg-panel/60 px-4 py-2.5 text-sm font-black text-muted transition hover:border-sky/40 hover:text-sky"
      >
        <ListPlus size={15} />
        Ajouter à une liste
      </button>

      {open && <AddToListModal bookId={bookId} onClose={() => setOpen(false)} />}
    </>
  );
}