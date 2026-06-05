"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { EditProfileModal } from "./EditProfileModal";

type Props = {
  user: {
    name: string | null;
    bio: string | null;
    image: string | null;
  };
};

export function EditProfileButton({ user }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded border border-line bg-panel/60 px-4 py-2 text-xs font-black text-muted transition hover:border-mint/50 hover:text-mint"
      >
        <Pencil size={13} />
        Modifier le profil
      </button>
      {open && <EditProfileModal user={user} onClose={() => setOpen(false)} />}
    </>
  );
}