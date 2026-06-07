"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Toast } from "@/components/ui/Toast";

type FollowButtonProps = {
  userId: string;
  initiallyFollowing?: boolean;
};

export function FollowButton({ userId, initiallyFollowing = false }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initiallyFollowing);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function followUser() {
    setIsSaving(true);
    setToast(null);

    const response = await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followingId: userId })
    });

    setIsSaving(false);

    if (!response.ok) {
      setToast({ tone: "error", message: "Ce lecteur n'a pas pu etre ajoute a ton cercle." });
      return;
    }

    setIsFollowing(true);
    setToast({ tone: "success", message: "Lecteur ajoute a ton cercle." });
  }

  return (
    <div>
      <button
        type="button"
        onClick={followUser}
        disabled={isFollowing || isSaving}
        className="inline-flex items-center gap-2 rounded bg-mint px-3 py-2 text-xs font-black text-ink transition hover:bg-lime disabled:bg-panelSoft disabled:text-muted"
      >
        <UserPlus size={14} />
        {isFollowing ? "Suivi" : isSaving ? "Ajout..." : "Suivre"}
      </button>
      {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
