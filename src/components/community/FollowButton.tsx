"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";

type FollowButtonProps = {
  userId: string;
  initiallyFollowing?: boolean;
};

export function FollowButton({ userId, initiallyFollowing = false }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initiallyFollowing);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function followUser() {
    setIsSaving(true);
    setMessage("");

    const response = await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followingId: userId })
    });
    const payload = await response.json();

    setIsSaving(false);

    if (!response.ok) {
      setMessage(payload.error?.message ?? "Impossible de suivre ce lecteur.");
      return;
    }

    setIsFollowing(true);
    setMessage("Ajoute a ton cercle.");
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
      {message ? <p className="mt-2 text-xs text-muted">{message}</p> : null}
    </div>
  );
}
