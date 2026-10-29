"use client";

import { useState } from "react";
import { UserPlus, X } from "lucide-react";

export function InviteButton({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/groups/${groupId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    });
    const payload = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setMessage({ tone: "error", text: payload?.error?.message ?? "L'invitation n'a pas pu être envoyée." });
      return;
    }
    setMessage({ tone: "success", text: `@${username.replace(/^@/, "")} est invité : le groupe apparaîtra dans ses suggestions.` });
    setUsername("");
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="bb-btn border border-ink/40 py-2.5 text-ink hover:bg-ink/10">
        <UserPlus size={15} aria-hidden />
        Inviter
      </button>
      {open ? (
        <form onSubmit={submit} className="bb-card absolute right-0 top-full z-20 mt-2 flex w-72 flex-col gap-2 p-4 text-paper">
          <div className="flex items-center justify-between">
            <p className="text-sm font-extrabold">Inviter un lecteur</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="text-muted hover:text-paper"><X size={15} /></button>
          </div>
          <label className="sr-only" htmlFor={`invite-${groupId}`}>Pseudo</label>
          <input id={`invite-${groupId}`} required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="@pseudo" className="bb-input" autoFocus />
          <button type="submit" disabled={busy} className="bb-btn-primary">{busy ? "Envoi…" : "Inviter"}</button>
          {message ? <p role="status" className={`text-xs font-bold ${message.tone === "success" ? "text-mint" : "text-coral"}`}>{message.text}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
