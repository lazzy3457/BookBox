import { genreLabel } from "@/lib/genres";

type GenreBadgesProps = {
  genres: readonly string[];
  limit?: number;
  size?: "sm" | "md";
  className?: string;
};

export function GenreBadges({ genres, limit, size = "md", className = "" }: GenreBadgesProps) {
  const visible = limit ? genres.slice(0, limit) : genres;
  if (!visible.length) return null;

  const badgeSize = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]";

  return (
    <ul className={`flex min-w-0 flex-wrap gap-1.5 ${className}`} aria-label="Genres">
      {visible.map((genre) => (
        <li
          key={genre}
          className={`rounded-full border border-sky/30 bg-sky/10 font-extrabold uppercase tracking-[0.1em] text-sky ${badgeSize}`}
        >
          {genreLabel(genre)}
        </li>
      ))}
    </ul>
  );
}
