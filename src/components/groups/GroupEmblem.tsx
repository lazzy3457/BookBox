import { BookOpen, Globe, Heart, Library, Moon, Search, Sparkles, Trophy, type LucideIcon } from "lucide-react";

const emblems: Record<string, { icon: LucideIcon; banner: string; tint: string }> = {
  book: { icon: BookOpen, banner: "from-mint to-coral", tint: "text-mint" },
  sparkles: { icon: Sparkles, banner: "from-[#5f7e93] to-[#2f4252]", tint: "text-[#4d6a7d]" },
  moon: { icon: Moon, banner: "from-[#5f7e93] to-[#2f4252]", tint: "text-[#4d6a7d]" },
  trophy: { icon: Trophy, banner: "from-amber to-coral", tint: "text-amber" },
  search: { icon: Search, banner: "from-mint to-coral", tint: "text-mint" },
  globe: { icon: Globe, banner: "from-[#4f7a4f] to-[#2f4a32]", tint: "text-[#4f7a4f]" },
  heart: { icon: Heart, banner: "from-coral to-mint", tint: "text-coral" },
  library: { icon: Library, banner: "from-[#4f7a4f] to-[#2f4a32]", tint: "text-[#4f7a4f]" }
};

export const emblemKeys = Object.keys(emblems);

export function emblemStyle(key: string) {
  return emblems[key] ?? emblems.book;
}

export function GroupEmblem({ emblem, size = 46, className = "" }: { emblem: string; size?: number; className?: string }) {
  const style = emblemStyle(emblem);
  const Icon = style.icon;
  return (
    <span className={`grid shrink-0 place-items-center rounded-xl bg-panel shadow-poster ${style.tint} ${className}`} style={{ width: size, height: size }}>
      <Icon size={Math.round(size * 0.44)} aria-hidden />
    </span>
  );
}
