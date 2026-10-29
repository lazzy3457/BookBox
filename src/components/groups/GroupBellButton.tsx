"use client";

import { useState } from "react";
import { Bell, BellRing } from "lucide-react";

// Cloche du groupe : par défaut on ne reçoit que les réponses et mentions ; activée, on reçoit aussi les nouvelles discussions.
export function GroupBellButton({ groupId, initial }: { groupId: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const response = await fetch(`/api/groups/${groupId}/notifications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifyAll: !on })
    });
    setBusy(false);
    if (response.ok) setOn(!on);
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      aria-pressed={on}
      aria-label={on ? "Ne plus être prévenu des nouvelles discussions" : "Être prévenu des nouvelles discussions"}
      title={on ? "Tu es prévenu de chaque nouvelle discussion" : "Tu n'es prévenu que des réponses et mentions"}
      className={`grid h-10 w-10 place-items-center rounded-full border transition ${on ? "border-ink bg-ink text-mint" : "border-ink/40 text-ink hover:bg-ink/10"}`}
    >
      {on ? <BellRing size={17} aria-hidden /> : <Bell size={17} aria-hidden />}
    </button>
  );
}
