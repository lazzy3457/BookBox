import { Star } from "lucide-react";
import { formatRating } from "@/lib/format";

type StarRatingProps = {
  value: number;
  max?: number;
  size?: number;
};

// Affiche une note arrondie à la demi-étoile la plus proche.
export function StarRating({ value, max = 5, size = 15 }: StarRatingProps) {
  const clampedValue = Math.round(Math.max(0, Math.min(max, value)) * 2) / 2;

  return (
    <span className="inline-flex items-center gap-1 text-amber" role="img" aria-label={`${formatRating(clampedValue)}/${max}`}>
      {Array.from({ length: max }, (_, index) => {
        const fill = clampedValue >= index + 1 ? 1 : clampedValue >= index + 0.5 ? 0.5 : 0;

        return (
          <span key={index} className="relative inline-flex">
            <Star size={size} fill={fill === 1 ? "currentColor" : "transparent"} />
            {fill === 0.5 ? (
              <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
                <Star size={size} fill="currentColor" className="max-w-none" />
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
