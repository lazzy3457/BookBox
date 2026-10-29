import { Bell, BookOpen, MessageSquareText, SlidersHorizontal } from "lucide-react";

export const threadTypeStyles = {
  ANNOUNCEMENT: { label: "Annonce", icon: Bell, badge: "bg-amber/10 text-amber", circle: "bg-amber/10 text-amber" },
  DEBATE: { label: "Débat", icon: MessageSquareText, badge: "bg-mint/10 text-mint", circle: "bg-mint/[0.08] text-mint" },
  POLL: { label: "Sondage", icon: SlidersHorizontal, badge: "bg-[#5f7e93]/10 text-[#4d6a7d]", circle: "bg-[#5f7e93]/10 text-[#4d6a7d]" },
  READALONG: { label: "Lecture commune", icon: BookOpen, badge: "bg-coral/10 text-coral", circle: "bg-coral/10 text-coral" }
} as const;

export function ThreadBadges({ type, spoilerLevel }: { type: keyof typeof threadTypeStyles; spoilerLevel: string | null }) {
  const style = threadTypeStyles[type];
  return (
    <span className="flex flex-wrap gap-1.5">
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em] ${style.badge}`}>{style.label}</span>
      {spoilerLevel ? (
        <span className="rounded-full bg-panelSoft px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted">Spoilers jusqu&apos;à {spoilerLevel}</span>
      ) : null}
    </span>
  );
}
