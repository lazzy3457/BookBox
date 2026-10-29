"use client";

import { Children, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type ShowMoreProps = {
  initial: number;
  children: React.ReactNode;
  className?: string;
};

// Affiche les `initial` premiers éléments, puis un bouton « Voir plus » pour dérouler le reste.
export function ShowMore({ initial, children, className = "flex flex-col gap-3" }: ShowMoreProps) {
  const [expanded, setExpanded] = useState(false);
  const items = Children.toArray(children);
  const hidden = items.length - initial;

  return (
    <div className={className}>
      {expanded ? items : items.slice(0, initial)}
      {hidden > 0 ? (
        <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="bb-btn-outline mx-auto w-fit px-5 py-2.5 text-sm text-mint">
          {expanded ? "Voir moins" : `Voir plus (${hidden})`}
          {expanded ? <ChevronUp size={15} aria-hidden /> : <ChevronDown size={15} aria-hidden />}
        </button>
      ) : null}
    </div>
  );
}
