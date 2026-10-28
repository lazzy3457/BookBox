import { Check, Footprints, Lock, Star } from "lucide-react";
import { JOURNEY_MILESTONES } from "@/lib/progression";

// Décalage horizontal des étapes, pour un chemin en lacets comme sur Duolingo.
const offsets = [0, 2.5, 4, 2.5, 0, -2.5, -4, -2.5];

export function JourneyPath({ journeyDays, started }: { journeyDays: number; started: boolean }) {
  const currentIndex = JOURNEY_MILESTONES.findIndex((milestone) => milestone.day > journeyDays);

  return (
    <ol className="relative mx-auto flex max-w-md flex-col items-center gap-3 py-2" aria-label="Étapes du parcours">
      {JOURNEY_MILESTONES.map((milestone, index) => {
        const done = started && journeyDays >= milestone.day;
        const current = started && index === currentIndex;
        const previousDay = JOURNEY_MILESTONES[index - 1]?.day ?? 0;
        const progress = current ? Math.round(((journeyDays - previousDay) / (milestone.day - previousDay)) * 100) : 0;
        const Icon = done ? Check : current ? Footprints : index === JOURNEY_MILESTONES.length - 1 ? Star : Lock;

        return (
          <li key={milestone.day} className="flex flex-col items-center text-center" style={{ transform: `translateX(${offsets[index % offsets.length]}rem)` }}>
            {index > 0 ? <span aria-hidden className={`mb-3 h-6 w-1 rounded-full ${done || current ? "bg-mint/60" : "bg-line"}`} /> : null}
            <span
              className={`relative grid h-16 w-16 place-items-center rounded-full border-4 transition ${
                done
                  ? "border-mint bg-mint text-ink shadow-glow"
                  : current
                    ? "border-mint bg-panel text-mint shadow-glow"
                    : "border-line bg-panelSoft text-muted"
              }`}
            >
              <Icon size={26} aria-hidden />
              {current ? (
                <svg className="absolute -inset-[7px] h-[78px] w-[78px] -rotate-90" viewBox="0 0 78 78" aria-hidden>
                  <circle cx="39" cy="39" r="36" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="4" />
                  <circle cx="39" cy="39" r="36" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(progress / 100) * 226} 226`} />
                </svg>
              ) : null}
            </span>
            <span className="mt-2 text-xs font-extrabold uppercase tracking-[0.16em] text-muted">Jour {milestone.day}</span>
            <span className={`font-display text-base font-extrabold ${done || current ? "text-paper" : "text-muted"}`}>{milestone.title}</span>
            <span className="max-w-[12rem] text-xs text-muted">
              {current ? `${journeyDays} / ${milestone.day} jours validés` : milestone.description}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
