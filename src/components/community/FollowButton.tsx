"use client";

import { Check, UserPlus } from "lucide-react";
import { useState } from "react";

type FollowButtonProps = {
  userId: string;
  initiallyFollowing?: boolean;
  size?: "small" | "block";
  onChange?: (isFollowing: boolean) => void;
};

// « Suivre » / « Abonné » : un second clic sur « Abonné » désabonne.
export function FollowButton({ userId, initiallyFollowing = false, size = "small", onChange }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initiallyFollowing);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);

  async function toggle() {
    setIsSaving(true);
    setError(false);
    const response = isFollowing
      ? await fetch(`/api/follows?followingId=${encodeURIComponent(userId)}`, { method: "DELETE" })
      : await fetch("/api/follows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ followingId: userId })
        });
    setIsSaving(false);
    if (!response.ok) {
      setError(true);
      return;
    }
    setIsFollowing(!isFollowing);
    onChange?.(!isFollowing);
  }

  const width = size === "block" ? "w-full" : "";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isSaving}
      aria-pressed={isFollowing}
      title={error ? "L'action n'a pas pu aboutir, réessaie." : isFollowing ? "Se désabonner" : undefined}
      className={`${isFollowing ? "bb-btn-outline" : "bb-btn-primary"} ${width} ${size === "small" ? "px-3 py-1.5 text-xs" : ""} ${error ? "ring-2 ring-coral" : ""}`}
    >
      {isFollowing ? <Check size={14} aria-hidden /> : <UserPlus size={14} aria-hidden />}
      {isSaving ? "…" : isFollowing ? "Abonné" : "Suivre"}
    </button>
  );
}
