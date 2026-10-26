import { BookCheck, Flame, Heart, Lock, MessageSquareQuote, MessagesSquare, NotebookPen, Route, type LucideIcon } from "lucide-react";
import type { BadgeIcon } from "@/lib/progression";

const icons: Record<BadgeIcon, LucideIcon> = {
  book: BookCheck,
  review: MessageSquareQuote,
  heart: Heart,
  comment: MessagesSquare,
  journal: NotebookPen,
  flame: Flame,
  route: Route
};

// Bronze, Argent, Or, Platine : couleurs prises dans les tokens du thème actif.
const tierStyles = [
  "border-coral/60 bg-coral/15 text-coral",
  "border-muted/60 bg-muted/15 text-muted",
  "border-amber/70 bg-amber/15 text-amber",
  "border-mint/70 bg-mint/15 text-mint"
];

const tierText = ["text-coral", "text-muted", "text-amber", "text-mint"];

export function tierTextClass(tier: number) {
  return tierText[Math.min(tier, tierText.length) - 1] ?? "text-muted";
}

type BadgeMedalProps = {
  icon: BadgeIcon;
  tier: number | null;
  size?: "sm" | "md" | "lg";
  label: string;
};

export function BadgeMedal({ icon, tier, size = "md", label }: BadgeMedalProps) {
  const Icon = tier ? icons[icon] : Lock;
  const dimension = size === "lg" ? "h-16 w-16" : size === "sm" ? "h-10 w-10" : "h-12 w-12";
  const iconSize = size === "lg" ? 28 : size === "sm" ? 18 : 22;
  const style = tier ? tierStyles[Math.min(tier, tierStyles.length) - 1] : "border-line bg-ink/60 text-muted/60";

  return (
    <span role="img" aria-label={label} className={`grid shrink-0 place-items-center rounded-full border-2 ${dimension} ${style}`}>
      <Icon size={iconSize} aria-hidden />
    </span>
  );
}
