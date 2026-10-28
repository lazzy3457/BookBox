import { BookOpen } from "lucide-react";

type BookCoverProps = {
  title: string;
  thumbnailUrl?: string | null;
  className?: string;
  // Affiche le titre sur la couverture de remplacement (grandes couvertures).
  showTitle?: boolean;
  iconSize?: number;
};

// Couverture de livre : image réelle, sinon dégradé bordeaux → terracotta avec l'icône livre.
export function BookCover({ title, thumbnailUrl, className = "h-[126px] w-[84px]", showTitle = false, iconSize = 16 }: BookCoverProps) {
  return (
    <div className={`bb-cover relative shrink-0 ${className}`}>
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full flex-col justify-between p-[10%]">
          {iconSize ? <BookOpen size={iconSize} aria-hidden className="shrink-0" /> : <span />}
          {showTitle ? (
            <div>
              <div className="font-display line-clamp-3 text-[15px] font-semibold leading-tight">{title}</div>
              <div className="mt-2 h-[3px] w-8 rounded-full bg-mint/70" />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
