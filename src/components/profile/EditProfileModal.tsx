"use client";

import { useState, useTransition } from "react";
import { X, Loader2, User } from "lucide-react";
import { updateProfile } from "@/server/actions/profile";

type Props = {
  user: {
    name: string | null;
    bio: string | null;
    image: string | null;
  };
  onClose: () => void;
};

export function EditProfileModal({ user, onClose }: Props) {
  const [name, setName] = useState(user.name ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [image, setImage] = useState(user.image ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSave() {
    if (!name.trim()) { setError("Le pseudo est requis."); return; }
    setError("");
    startTransition(async () => {
      await updateProfile({ name, bio, image });
      onClose();
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/80 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 overflow-hidden rounded border border-line bg-panel shadow-poster">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <User size={16} className="text-mint" />
            <span className="text-sm font-black text-paper">Modifier le profil</span>
          </div>
          <button onClick={onClose} className="text-muted hover:text-paper transition">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {/* Avatar preview */}
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded border border-line bg-ink text-2xl font-black text-mint">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" className="h-full w-full object-cover" />
              ) : (
                (name || user.name || "B").slice(0, 1)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.16em] text-muted">
                URL de la photo
              </label>
              <input
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://..."
                className="w-full rounded border border-line bg-ink/50 px-3 py-2 text-sm text-paper placeholder:text-muted/50 focus:border-mint/60 focus:outline-none"
              />
            </div>
          </div>

          {/* Pseudo */}
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.16em] text-muted">
              Pseudo <span className="text-coral">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-line bg-ink/50 px-3 py-2.5 text-sm text-paper placeholder:text-muted/50 focus:border-mint/60 focus:outline-none"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.16em] text-muted">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Quelques mots sur toi..."
              className="w-full resize-none rounded border border-line bg-ink/50 px-3 py-2.5 text-sm text-paper placeholder:text-muted/50 focus:border-mint/60 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-coral">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="rounded border border-line px-4 py-2.5 text-sm font-black text-muted transition hover:text-paper"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || pending}
              className="flex flex-1 items-center justify-center gap-2 rounded bg-mint px-4 py-2.5 text-sm font-black text-ink transition hover:bg-mint/90 disabled:opacity-50"
            >
              {pending ? <Loader2 size={15} className="animate-spin" /> : null}
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    </>
  );
}