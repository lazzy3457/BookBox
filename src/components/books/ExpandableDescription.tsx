"use client";

import { useEffect, useRef, useState } from "react";

type ExpandableDescriptionProps = {
  text: string;
};

export function ExpandableDescription({ text }: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const content = contentRef.current;

    if (!content) {
      return;
    }

    setCanExpand(content.scrollHeight > content.clientHeight + 4);
  }, [text]);

  return (
    <div className="text-sm leading-relaxed text-paper">
      <div ref={contentRef} className={expanded ? "" : "max-h-32 overflow-hidden"}>
        <p>{text}</p>
      </div>
      {canExpand && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 inline-flex text-[13px] font-extrabold text-mint hover:underline"
          aria-label="Lire toute la description"
        >
          Lire la suite
        </button>
      ) : null}
      {canExpand && expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-2 inline-flex text-[13px] font-extrabold text-mint hover:underline"
        >
          Voir moins
        </button>
      ) : null}
    </div>
  );
}
