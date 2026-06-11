"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ActivityRow } from "@/components/activity/ActivityRow";

type ActivityItem = {
  id: string;
  type: "review" | "library";
  userName: string;
  bookId: string;
  bookTitle: string;
  detail: string;
};

type ActivityFeedPreviewProps = {
  items: ActivityItem[];
};

const INITIAL_VISIBLE_ITEMS = 5;

export function ActivityFeedPreview({ items }: ActivityFeedPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleItems = isExpanded ? items : items.slice(0, INITIAL_VISIBLE_ITEMS);
  const remainingCount = items.length - INITIAL_VISIBLE_ITEMS;

  return (
    <div className="w-full min-w-0 max-w-full space-y-3 overflow-hidden">
      {visibleItems.map((item) => (
        <ActivityRow
          key={item.id}
          type={item.type}
          userName={item.userName}
          bookId={item.bookId}
          bookTitle={item.bookTitle}
          detail={item.detail}
        />
      ))}

      {remainingCount > 0 ? (
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="inline-flex w-full items-center justify-center gap-2 rounded border border-line bg-panel/70 px-4 py-2 text-sm font-black text-muted transition hover:border-mint hover:text-mint sm:w-auto"
        >
          {isExpanded ? "Voir moins" : "Voir plus"}
          {!isExpanded ? <span className="rounded bg-ink px-2 py-0.5 text-xs text-paper">+{remainingCount}</span> : null}
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      ) : null}
    </div>
  );
}
