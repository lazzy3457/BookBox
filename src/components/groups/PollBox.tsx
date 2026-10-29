"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, SlidersHorizontal } from "lucide-react";
import { plural } from "@/lib/format";

type PollBoxProps = {
  pollId: string;
  question: string;
  options: Array<{ id: string; label: string; votes: number }>;
  myVote: string | null;
  daysLeft: number | null;
  isClosed: boolean;
  canVote: boolean;
};

export function PollBox({ pollId, question, options, myVote, daysLeft, isClosed, canVote }: PollBoxProps) {
  const router = useRouter();
  const [vote, setVote] = useState(myVote);
  const [counts, setCounts] = useState(() => new Map(options.map((option) => [option.id, option.votes])));
  const [busy, setBusy] = useState(false);
  const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
  const showResults = Boolean(vote) || isClosed || !canVote;

  async function choose(optionId: string) {
    if (!canVote || isClosed || busy || optionId === vote) return;
    setBusy(true);
    const response = await fetch(`/api/polls/${pollId}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId })
    });
    setBusy(false);
    if (!response.ok) return;
    setCounts((current) => {
      const next = new Map(current);
      if (vote) next.set(vote, Math.max(0, (next.get(vote) ?? 1) - 1));
      next.set(optionId, (next.get(optionId) ?? 0) + 1);
      return next;
    });
    setVote(optionId);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-ink p-4">
      <p className="flex items-center gap-2 text-[13px] font-extrabold text-paper">
        <SlidersHorizontal size={15} aria-hidden className="text-[#4d6a7d]" />
        Sondage · {question}
      </p>
      {options.map((option) => {
        const value = counts.get(option.id) ?? 0;
        const percent = total ? Math.round((value / total) * 100) : 0;
        const mine = vote === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => void choose(option.id)}
            disabled={!canVote || isClosed || busy}
            aria-pressed={mine}
            className={`relative overflow-hidden rounded-xl border bg-panel text-left text-[13px] font-bold text-paper transition ${mine ? "border-mint ring-1 ring-mint" : "border-line hover:border-mint/50"} disabled:cursor-default`}
          >
            {showResults ? <span aria-hidden className={`absolute inset-y-0 left-0 ${mine ? "bg-mint/15" : "bg-panelSoft/70"}`} style={{ width: `${percent}%` }} /> : null}
            <span className="relative flex items-center gap-2 px-4 py-2.5">
              {mine ? <CheckCircle2 size={15} aria-hidden className="text-mint" /> : null}
              {option.label}
              {showResults ? <span className={`ml-auto ${mine ? "text-mint" : "text-muted"}`}>{percent} %</span> : null}
            </span>
          </button>
        );
      })}
      <p className="text-[11px] text-muted">
        {[plural(total, "vote"), vote ? "tu as voté" : null, isClosed ? "sondage terminé" : daysLeft != null ? `se termine dans ${plural(daysLeft, "jour")}` : null, !canVote && !isClosed ? "rejoins le groupe pour voter" : null].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
}
