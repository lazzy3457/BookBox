import { BookOpen } from "lucide-react";

const sampleCovers = [
  ["#00d474", "#14532d", "Roman"],
  ["#4ca3ff", "#172554", "Essai"],
  ["#f5c451", "#78350f", "Manga"],
  ["#ff6b57", "#7f1d1d", "Polar"],
  ["#9ae66e", "#1f2937", "SF"],
  ["#c084fc", "#312e81", "Poésie"],
  ["#38bdf8", "#0f172a", "BD"],
  ["#fb7185", "#4c0519", "Classique"]
];

export function CoverShelf() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {sampleCovers.map(([accent, base, label], index) => (
        <div
          key={label}
          className="cover-sheen aspect-[2/3] rounded border border-white/12 p-3 shadow-poster"
          style={{ background: `linear-gradient(145deg, ${accent}, ${base} 54%, #071017)` }}
        >
          <div className="flex h-full flex-col justify-between">
            <BookOpen size={18} className="text-white/80" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/65">BooksBox</div>
              <div className="mt-1 text-sm font-black leading-tight text-white">{label}</div>
              <div className="mt-2 h-1 w-7 rounded bg-white/70" />
            </div>
            <div className="text-right text-[10px] font-bold text-white/45">#{index + 1}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
