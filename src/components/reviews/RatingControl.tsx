"use client";

import { Star } from "lucide-react";

type RatingControlProps = {
  value: number;
  onChange: (value: number) => void;
};

export function RatingControl({ value, onChange }: RatingControlProps) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => onChange(rating)}
          className="grid h-9 w-9 place-items-center rounded border border-line bg-panelSoft text-amber transition hover:border-amber"
          aria-label={`${rating} étoiles`}
        >
          <Star size={18} fill={rating <= value ? "currentColor" : "transparent"} />
        </button>
      ))}
    </div>
  );
}
