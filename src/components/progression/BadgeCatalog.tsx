import { Check } from "lucide-react";
import { BadgeMedal, tierTextClass } from "@/components/progression/BadgeMedal";
import { formatBadgeCount, type BadgeIcon } from "@/lib/progression";

type CatalogBadge = {
  slug: string;
  name: string;
  description: string;
  icon: BadgeIcon;
  unit: string;
  unitOne: string;
  value: number;
  next: { tier: number; threshold: number } | null;
  tiers: Array<{ tier: number; name: string; threshold: number; earnedAt: Date | null }>;
};

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export function BadgeCatalog({ badges }: { badges: CatalogBadge[] }) {
  const earnedCount = badges.reduce((total, badge) => total + badge.tiers.filter((tier) => tier.earnedAt).length, 0);
  const tierCount = badges.reduce((total, badge) => total + badge.tiers.length, 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        <span className="font-extrabold text-paper">{earnedCount}</span> {earnedCount > 1 ? "paliers obtenus" : "palier obtenu"} sur {tierCount}. Chaque badge se débloque en plusieurs paliers : Bronze, Argent, Or, puis Platine.
      </p>
      <ul className="grid min-w-0 gap-3 xl:grid-cols-2">
        {badges.map((badge) => {
          const best = [...badge.tiers].reverse().find((tier) => tier.earnedAt);
          const previousThreshold = badge.next ? (badge.tiers[badge.next.tier - 2]?.threshold ?? 0) : 0;
          const progress = badge.next
            ? Math.min(100, Math.round(((badge.value - previousThreshold) / (badge.next.threshold - previousThreshold)) * 100))
            : 100;

          return (
            <li key={badge.slug} className="min-w-0 rounded border border-line bg-ink/40 p-4">
              <div className="flex min-w-0 items-start gap-4">
                <BadgeMedal icon={badge.icon} tier={best?.tier ?? null} size="lg" label={best ? `${badge.name}, palier ${best.name}` : `${badge.name}, verrouillé`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h3 className="font-extrabold text-paper">{badge.name}</h3>
                    <span className="text-xs font-bold tabular-nums text-muted">{formatBadgeCount(badge, badge.value)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{badge.description}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label={`Progression vers le prochain palier de ${badge.name}`}>
                    <div className="h-full rounded-full bg-mint transition-[width]" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-muted">
                    {badge.next ? `Prochain palier : ${badge.tiers[badge.next.tier - 1].name} à ${formatBadgeCount(badge, badge.next.threshold)}.` : "Tous les paliers sont obtenus."}
                  </p>
                </div>
              </div>
              <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {badge.tiers.map((tier) => (
                  <li key={tier.tier} className={`rounded border px-2.5 py-2 text-xs ${tier.earnedAt ? "border-line bg-panel" : "border-dashed border-line text-muted"}`}>
                    <div className={`flex items-center gap-1 font-extrabold ${tier.earnedAt ? tierTextClass(tier.tier) : ""}`}>
                      {tier.earnedAt ? <Check size={12} aria-hidden /> : null}
                      {tier.name}
                    </div>
                    <div className="mt-0.5 tabular-nums text-muted">{formatBadgeCount(badge, tier.threshold)}</div>
                    {tier.earnedAt ? <div className="mt-0.5 text-[11px] text-muted">{dateFormat.format(tier.earnedAt)}</div> : null}
                  </li>
                ))}
              </ol>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
