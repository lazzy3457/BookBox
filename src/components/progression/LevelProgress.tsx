import type { levelProgress } from "@/lib/progression";

type Level = ReturnType<typeof levelProgress>;

export function LevelBadge({ level, className = "" }: { level: number; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border border-mint/50 bg-mint/10 px-2.5 py-0.5 text-xs font-black tabular-nums text-mint ${className}`}>
      Niv. {level}
    </span>
  );
}

export function LevelBar({ level, compact = false }: { level: Level; compact?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-bold text-muted">Vers le niveau {level.level + 1}</span>
        <span className="tabular-nums text-muted">
          {level.xpIntoLevel} / {level.xpForNextLevel} XP
        </span>
      </div>
      <div
        className={`mt-1.5 overflow-hidden rounded-full bg-line ${compact ? "h-1.5" : "h-3"}`}
        role="progressbar"
        aria-label={`Progression vers le niveau ${level.level + 1}`}
        aria-valuemin={0}
        aria-valuemax={level.xpForNextLevel}
        aria-valuenow={level.xpIntoLevel}
      >
        <div className="h-full rounded-full bg-mint" style={{ width: `${level.percent}%` }} />
      </div>
      {compact ? null : <p className="mt-2 text-xs text-muted">Encore {level.xpToNextLevel} XP pour le niveau {level.level + 1}.</p>}
    </div>
  );
}
