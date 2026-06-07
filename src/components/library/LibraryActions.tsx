"use client";

import { ReadingStatus } from "@prisma/client";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toast } from "@/components/ui/Toast";

type LibraryActionsProps = {
  bookId: string;
  initialStatus?: ReadingStatus | null;
};

const labels: Record<ReadingStatus, string> = {
  TO_READ: "A lire",
  READING: "En cours",
  READ: "Lu",
  ABANDONED: "Abandonne"
};

export function LibraryActions({ bookId, initialStatus = null }: LibraryActionsProps) {
  const router = useRouter();
  const [status, setCurrentStatus] = useState<ReadingStatus | null>(initialStatus);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);

  async function setStatus(nextStatus: ReadingStatus) {
    setToast(null);
    const response = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, status: nextStatus })
    });

    if (!response.ok) {
      setToast({ tone: "error", message: "Ta bibliotheque n'a pas pu etre mise a jour." });
      return;
    }

    setCurrentStatus(nextStatus);
    setToast({ tone: "success", message: `Statut mis a jour : ${labels[nextStatus]}.` });
    router.refresh();
  }

  async function removeFromLibrary() {
    setToast(null);
    const response = await fetch(`/api/library?bookId=${encodeURIComponent(bookId)}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      setToast({ tone: "error", message: "Ce livre n'a pas pu etre retire de ta bibliotheque." });
      return;
    }

    setCurrentStatus(null);
    setToast({ tone: "success", message: "Livre retire de ta bibliotheque." });
    router.refresh();
  }

  return (
    <div>
      {status ? (
        <div className="mb-3 rounded border border-mint/35 bg-mint/10 px-3 py-2 text-xs font-black text-mint">
          Deja dans ta bibliotheque : {labels[status]}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(labels).map(([nextStatus, label]) => (
          <button
            key={nextStatus}
            onClick={() => setStatus(nextStatus as ReadingStatus)}
            className={`rounded border px-3 py-2 text-xs font-bold transition ${
              status === nextStatus
                ? "border-mint bg-mint text-ink"
                : "border-line bg-panelSoft text-white/70 hover:border-mint hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {status ? (
        <button
          type="button"
          onClick={removeFromLibrary}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded border border-line px-3 py-2 text-xs font-bold text-muted transition hover:border-coral hover:text-coral"
        >
          <Trash2 size={14} />
          Retirer de ma bibliotheque
        </button>
      ) : null}
      {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
