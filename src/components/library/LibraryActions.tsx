"use client";

import { ReadingStatus } from "@prisma/client";

type LibraryActionsProps = {
  bookId: string;
};

const labels: Record<ReadingStatus, string> = {
  TO_READ: "À lire",
  READING: "En cours",
  READ: "Lu",
  ABANDONED: "Abandonné"
};

export function LibraryActions({ bookId }: LibraryActionsProps) {
  async function setStatus(status: ReadingStatus) {
    await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, status })
    });
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {Object.entries(labels).map(([status, label]) => (
        <button
          key={status}
          onClick={() => setStatus(status as ReadingStatus)}
          className="rounded border border-line bg-panelSoft px-3 py-2 text-xs font-bold text-white/70 transition hover:border-mint hover:text-white"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
