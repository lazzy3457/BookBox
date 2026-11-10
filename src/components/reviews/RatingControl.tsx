"use client";

import { useRef, useState } from "react";
import { Star } from "lucide-react";
import { formatRating } from "@/lib/format";

type RatingControlProps = {
  value: number;
  onChange: (value: number) => void;
};

const STARS = [1, 2, 3, 4, 5];
const MIN = 0.5;
const MAX = 5;

function clamp(rating: number) {
  return Math.max(MIN, Math.min(MAX, rating));
}

// Note par glissement : les étoiles se remplissent sous le curseur ou le doigt, par demi-étoile.
// Un clic, un appui ou un glisser fixe la note ; au clavier, les flèches l'ajustent.
export function RatingControl({ value, onChange }: RatingControlProps) {
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? value;

  function ratingAt(clientX: number) {
    const rect = track.current?.getBoundingClientRect();
    if (!rect || !rect.width) return value;
    return clamp(Math.ceil(((clientX - rect.left) / rect.width) * 10) / 2);
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const rating = ratingAt(event.clientX);
    setPreview(rating);
    onChange(rating);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    // À la souris, le survol suffit à prévisualiser ; au doigt, seul le glisser compte.
    if (!dragging.current && event.pointerType !== "mouse") return;
    const rating = ratingAt(event.clientX);
    setPreview(rating);
    if (dragging.current && rating !== value) onChange(rating);
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    dragging.current = false;
    if (event.pointerType !== "mouse") setPreview(null);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const next =
      event.key === "ArrowRight" || event.key === "ArrowUp" ? value + 0.5
      : event.key === "ArrowLeft" || event.key === "ArrowDown" ? value - 0.5
      : event.key === "Home" ? MIN
      : event.key === "End" ? MAX
      : null;
    if (next === null) return;
    event.preventDefault();
    onChange(clamp(next));
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label="Note"
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={value}
        aria-valuetext={`${formatRating(value)} sur 5`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => { if (!dragging.current) setPreview(null); }}
        onKeyDown={onKeyDown}
        // pan-y : glisser à l'horizontale règle la note, glisser à la verticale fait toujours défiler la page.
        className="flex cursor-pointer touch-pan-y select-none items-center rounded text-amber outline-none focus-visible:ring-2 focus-visible:ring-mint"
      >
        {STARS.map((star) => {
          const fill = shown >= star ? 1 : shown >= star - 0.5 ? 0.5 : 0;

          return (
            <span key={star} className="grid h-10 w-9 place-items-center" aria-hidden>
              <span className="relative inline-flex">
                <Star size={28} fill={fill === 1 ? "currentColor" : "transparent"} />
                {fill === 0.5 ? (
                  <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
                    <Star size={28} fill="currentColor" className="max-w-none" />
                  </span>
                ) : null}
              </span>
            </span>
          );
        })}
      </div>
      <span className="min-w-[4ch] text-sm font-extrabold text-amber">{formatRating(shown)}/5</span>
    </div>
  );
}
