import { BadgeMedal, tierTextClass } from "@/components/progression/BadgeMedal";
import { formatBadgeCount, type BadgeIcon } from "@/lib/progression";

type EarnedBadge = {
  slug: string;
  name: string;
  icon: BadgeIcon;
  tier: number;
  tierName: string;
  threshold: number;
  unit: string;
  unitOne: string;
};

export function BadgeShowcase({ badges, emptyMessage }: { badges: EarnedBadge[]; emptyMessage: string }) {
  if (!badges.length) {
    return <div className="rounded border border-line bg-panel/65 p-6 text-sm text-muted">{emptyMessage}</div>;
  }

  return (
    <ul className="grid min-w-0 grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {badges.map((badge) => (
        <li key={badge.slug} className="flex min-w-0 items-center gap-3 rounded border border-line bg-panel/80 p-3 shadow-poster">
          <BadgeMedal icon={badge.icon} tier={badge.tier} label={`${badge.name}, palier ${badge.tierName}`} />
          <div className="min-w-0">
            <div className="truncate font-extrabold text-paper">{badge.name}</div>
            <div className="text-xs font-bold">
              <span className={tierTextClass(badge.tier)}>{badge.tierName}</span>
              <span className="text-muted"> · {formatBadgeCount(badge, badge.threshold)}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
