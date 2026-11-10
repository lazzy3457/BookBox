"use client";

import { Star } from "lucide-react";
import { formatRating } from "@/lib/format";

type RatingControlProps = {
  value: number;
  onChange: (value: number) => void;
};

// Chaque étoile porte deux zones : la moitié gauche donne la demi-étoile, la droite l'étoile entière.
export function RatingControl({ value, onChange }: RatingControlProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <div className="flex items-center gap-1" role="group" aria-label="Note">
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = value >= star ? 1 : value >= star - 0.5 ? 0.5 : 0;

          return (
            <span key={star} className="relative grid h-10 w-10 place-items-center rounded border border-line bg-panelSoft text-amber transition hover:border-amber">
              <span className="relative inline-flex" aria-hidden>
                <Star size={20} fill={fill === 1 ? "currentColor" : "transparent"} />
                {fill === 0.5 ? (
                  <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
                    <Star size={20} fill="currentColor" className="max-w-none" />
                  </span>
                ) : null}
              </span>
              {[star - 0.5, star].map((rating, half) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => onChange(rating)}
                  aria-label={`${formatRating(rating)} étoile${rating > 1 ? "s" : ""}`}
                  aria-pressed={value === rating}
                  className={`absolute inset-y-0 w-1/2 ${half ? "right-0" : "left-0"}`}
                />
              ))}
            </span>
          );
        })}
      </div>
      <span className="min-w-[3ch] text-sm font-extrabold text-amber">{formatRating(value)}/5</span>
    </div>
  );
}
