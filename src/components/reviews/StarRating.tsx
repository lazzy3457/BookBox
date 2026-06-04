import { Star } from "lucide-react";

type StarRatingProps = {
  value: number;
  max?: number;
};

export function StarRating({ value, max = 5 }: StarRatingProps) {
  const clampedValue = Math.max(0, Math.min(max, value));

  return (
    <div className="flex items-center gap-1 text-amber" aria-label={`${clampedValue}/${max}`}>
      {Array.from({ length: max }, (_, index) => {
        const filled = index < clampedValue;

        return <Star key={index} size={15} fill={filled ? "currentColor" : "transparent"} />;
      })}
    </div>
  );
}
