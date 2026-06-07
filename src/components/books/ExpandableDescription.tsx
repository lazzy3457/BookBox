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
    <div className="mt-5 max-w-3xl leading-7 text-white/65">
      <div ref={contentRef} className={expanded ? "" : "max-h-40 overflow-hidden"}>
        <p>{text}</p>
      </div>
      {canExpand && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 inline-flex rounded px-1 text-sm font-black text-mint transition hover:text-lime"
          aria-label="Lire toute la description"
        >
          ...
        </button>
      ) : null}
      {canExpand && expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-2 inline-flex rounded px-1 text-sm font-black text-mint transition hover:text-lime"
        >
          Voir moins
        </button>
      ) : null}
    </div>
  );
}
