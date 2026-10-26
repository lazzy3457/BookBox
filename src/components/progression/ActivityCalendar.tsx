import { Snowflake } from "lucide-react";
import { addDays, dayToDate } from "@/lib/progression";

type CalendarDay = { day: string; xp: number; validated: boolean; frozen: boolean };

const weekdays = ["L", "M", "M", "J", "V", "S", "D"];
const labelFormat = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

// Les 5 dernières semaines, du lundi au dimanche, aujourd'hui compris.
export function ActivityCalendar({ today, days, dailyGoal }: { today: string; days: CalendarDay[]; dailyGoal: number }) {
  const byDay = new Map(days.map((entry) => [entry.day, entry]));
  const todayWeekday = (dayToDate(today).getUTCDay() + 6) % 7;
  const start = addDays(today, -(28 + todayWeekday));
  const cells = Array.from({ length: 29 + todayWeekday }, (_, index) => addDays(start, index));

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-black text-muted" aria-hidden>
        {weekdays.map((weekday, index) => <span key={index}>{weekday}</span>)}
      </div>
      <ol className="mt-1.5 grid grid-cols-7 gap-1.5">
        {cells.map((day) => {
          const entry = byDay.get(day);
          const status = entry?.frozen ? "gel utilisé" : entry?.validated ? "validé" : entry?.xp ? `${entry.xp} / ${dailyGoal} XP` : "aucune activité";
          return (
            <li
              key={day}
              title={`${labelFormat.format(dayToDate(day))} : ${status}`}
              aria-label={`${labelFormat.format(dayToDate(day))} : ${status}`}
              className={`grid aspect-square place-items-center rounded text-[11px] font-bold tabular-nums ${
                entry?.frozen
                  ? "bg-sky/25 text-sky"
                  : entry?.validated
                    ? "bg-mint text-ink"
                    : entry?.xp
                      ? "bg-mint/20 text-paper"
                      : "bg-line/50 text-muted"
              } ${day === today ? "ring-2 ring-mint ring-offset-2 ring-offset-panel" : ""}`}
            >
              {entry?.frozen ? <Snowflake size={13} aria-hidden /> : Number(day.slice(8))}
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-mint" />Validé</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-mint/20" />Commencé</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-sky/25" />Gel utilisé</span>
      </div>
    </div>
  );
}
