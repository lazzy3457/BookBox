"use client";

import { Flag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Toast } from "@/components/ui/Toast";
import { DAILY_GOAL_OPTIONS } from "@/lib/progression";

type ToastState = { message: string; tone: "success" | "error" } | null;

async function patchProgress(body: Record<string, unknown>) {
  const response = await fetch("/api/progression", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error();
}

export function DailyGoalPicker({ dailyGoal }: { dailyGoal: number }) {
  const router = useRouter();
  const [goal, setGoal] = useState(dailyGoal);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  async function select(next: number) {
    if (next === goal || saving) return;
    const previous = goal;
    setGoal(next); setSaving(true);
    try {
      await patchProgress({ dailyGoal: next });
      setToast({ message: `Objectif quotidien : ${next} XP.`, tone: "success" });
      router.refresh();
    } catch {
      setGoal(previous);
      setToast({ message: "L’objectif n’a pas pu être enregistré.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div role="radiogroup" aria-label="Objectif quotidien" className="grid gap-2 sm:grid-cols-2">
        {DAILY_GOAL_OPTIONS.map((option) => (
          <button key={option.value} type="button" role="radio" aria-checked={goal === option.value} disabled={saving} onClick={() => select(option.value)}
            className={`rounded border p-3 text-left transition disabled:cursor-wait ${goal === option.value ? "border-mint bg-mint/10" : "border-line bg-ink/40 hover:border-mint/50"}`}>
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-extrabold text-paper">{option.label}</span>
              <span className="text-sm font-extrabold tabular-nums text-mint">{option.value} XP</span>
            </span>
            <span className="mt-1 block text-xs text-muted">Par exemple {option.hint}.</span>
          </button>
        ))}
      </div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  );
}

export function StartJourneyButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true); setError(null);
    try {
      const response = await fetch("/api/progression/start", { method: "POST" });
      if (!response.ok) throw new Error();
      router.refresh();
    } catch {
      setError("Le parcours n’a pas pu démarrer. Réessaie dans un instant.");
      setPending(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={start} disabled={pending} className="inline-flex items-center gap-2 rounded-full bg-mint px-5 py-3 font-extrabold text-ink transition hover:bg-lime disabled:opacity-60">
        <Flag size={17} aria-hidden />
        {pending ? "Démarrage…" : "Démarrer mon parcours"}
      </button>
      {error ? <p role="alert" className="mt-2 text-sm text-coral">{error}</p> : null}
    </div>
  );
}

// Aligne le fuseau enregistré sur celui du navigateur, pour que « aujourd'hui » soit le bon jour.
export function TimezoneSync({ timezone }: { timezone: string }) {
  const router = useRouter();

  useEffect(() => {
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!browserZone || browserZone === timezone) return;
    patchProgress({ timezone: browserZone }).then(() => router.refresh()).catch(() => undefined);
  }, [timezone, router]);

  return null;
}
