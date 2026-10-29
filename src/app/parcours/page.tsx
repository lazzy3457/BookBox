import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { BookCheck, Flame, Medal, Snowflake, Sparkles } from "lucide-react";
import { authOptions } from "@/server/auth/options";
import { getBadgeOverview, getProgressSummary } from "@/server/services/progression";
import { BadgeCatalog } from "@/components/progression/BadgeCatalog";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { JourneyPath } from "@/components/progression/JourneyPath";
import { ActivityCalendar } from "@/components/progression/ActivityCalendar";
import { DailyGoalPicker, StartJourneyButton, TimezoneSync } from "@/components/progression/ProgressControls";
import { LevelBar } from "@/components/progression/LevelProgress";
import { DAILY_XP_CAPS, XP_RULES, type XpReasonKey } from "@/lib/progression";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mon parcours", robots: { index: false } };

const capLabels: Record<string, string> = {
  journal: `${DAILY_XP_CAPS.journal} XP max par jour`,
  comments: `${DAILY_XP_CAPS.comments} XP max par jour`,
  library: `${DAILY_XP_CAPS.library} XP max par jour`,
  follows: `${DAILY_XP_CAPS.follows} XP max par jour`,
  likes: `${DAILY_XP_CAPS.likes} XP max par jour, likes cumulés`
};
const timeFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function JourneyPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <div className="rounded border border-line bg-panel/75 p-5 sm:p-8">
        <h1 className="text-2xl font-extrabold text-paper">Mon parcours</h1>
        <p className="mt-3 text-muted">Connecte-toi pour suivre ton parcours de lecture, ta série et tes badges.</p>
        <Link href="/login" className="mt-5 inline-block rounded-full bg-mint px-5 py-3 font-extrabold text-ink">Connexion</Link>
      </div>
    );
  }

  const [progress, badges] = await Promise.all([getProgressSummary(session.user.id), getBadgeOverview(session.user.id)]);
  const started = Boolean(progress.journeyStartedAt);
  const todayPercent = Math.min(100, Math.round((progress.todayXp / progress.dailyGoal) * 100));

  return (
    <div className="min-w-0">
      <TimezoneSync timezone={progress.timezone} />
      <SectionHeader
        eyebrow="Progression"
        title="Mon parcours"
        description="Chaque action rapporte de l’XP. Atteins ton objectif quotidien pour valider la journée et faire grandir ta série."
        action={<a href="#tous-les-badges" className="bb-btn-soft"><Medal size={16} aria-hidden />Tous les badges</a>}
      />

      <section aria-label="Niveau" className="mb-4 flex min-w-0 flex-col gap-4 rounded border border-line bg-gradient-to-br from-slateCard via-panel to-ink p-5 shadow-poster sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-4 border-mint bg-panel font-display text-2xl font-extrabold tabular-nums text-mint shadow-glow">
            {progress.level.level}
          </div>
          <div>
            <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-mint">Niveau {progress.level.level}</div>
            <div className="font-display text-2xl font-extrabold text-paper">{progress.level.title}</div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <LevelBar level={progress.level} />
        </div>
      </section>

      <section aria-label="Résumé" className="mb-8 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded border border-line bg-panel/80 p-5 shadow-poster">
          <div className="flex items-center gap-2 text-sm text-muted"><Flame size={16} className={progress.streak ? "text-coral" : ""} aria-hidden />Série en cours</div>
          <div className="mt-2 text-2xl font-extrabold tabular-nums text-paper sm:text-3xl">{progress.streak} {progress.streak > 1 ? "jours" : "jour"}</div>
          <p className="mt-1 text-xs text-muted">
            {!started ? "Démarre ton parcours pour lancer ta série." : progress.validatedToday ? "Journée validée, à demain !" : progress.streakAtRisk ? "Valide aujourd’hui pour garder ta série." : `Record : ${progress.longestStreak} jours.`}
          </p>
        </div>
        <div className="rounded border border-line bg-panel/80 p-5 shadow-poster">
          <div className="flex items-center justify-between gap-2 text-sm text-muted"><span>Objectif du jour</span><span className="font-extrabold tabular-nums text-paper">{progress.todayXp} / {progress.dailyGoal} XP</span></div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="XP du jour" aria-valuemin={0} aria-valuemax={progress.dailyGoal} aria-valuenow={Math.min(progress.todayXp, progress.dailyGoal)}>
            <div className="h-full rounded-full bg-mint" style={{ width: `${todayPercent}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">{progress.validatedToday ? "Objectif atteint." : `Encore ${Math.max(0, progress.dailyGoal - progress.todayXp)} XP pour valider la journée.`}</p>
        </div>
        <div className="rounded border border-line bg-panel/80 p-5 shadow-poster">
          <div className="flex items-center gap-2 text-sm text-muted"><Sparkles size={16} aria-hidden />XP totale</div>
          <div className="mt-2 text-2xl font-extrabold tabular-nums text-paper sm:text-3xl">{progress.xpTotal.toLocaleString("fr-FR")}</div>
          <p className="mt-1 text-xs text-muted">{progress.journeyDays} {progress.journeyDays > 1 ? "jours validés" : "jour validé"} au total.</p>
        </div>
        <div className="rounded border border-line bg-panel/80 p-5 shadow-poster">
          <div className="flex items-center gap-2 text-sm text-muted"><Snowflake size={16} className="text-sky" aria-hidden />Gels de série</div>
          <div className="mt-2 text-2xl font-extrabold tabular-nums text-paper sm:text-3xl">{progress.streakFreezes} / 2</div>
          <p className="mt-1 text-xs text-muted">Un gel sauve un jour manqué. Tu en gagnes un tous les 7 jours de série.</p>
        </div>
      </section>

      {!started ? (
        <section className="mb-8 flex flex-col gap-4 rounded border border-mint/40 bg-mint/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex gap-4">
            <BookCheck className="mt-1 shrink-0 text-mint" aria-hidden />
            <div>
              <h2 className="font-display text-xl font-extrabold text-paper">Ton parcours commence avec un livre terminé</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted">
                {progress.canStartJourney
                  ? "Tu as déjà terminé au moins un livre : tu peux lancer ton parcours dès maintenant."
                  : "Marque un livre comme lu dans ta bibliothèque. Ce premier livre valide le jour 1, ensuite chaque journée se valide avec ton objectif d’XP."}
              </p>
            </div>
          </div>
          {progress.canStartJourney ? <StartJourneyButton /> : <Link href="/library" className="shrink-0 rounded-full bg-mint px-5 py-3 text-center font-extrabold text-ink transition hover:bg-lime">Ma bibliothèque</Link>}
        </section>
      ) : null}

      <div className="grid min-w-0 gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <section aria-labelledby="chemin" className="min-w-0 overflow-hidden rounded border border-line bg-panel/60 p-5 shadow-poster sm:p-7">
          <h2 id="chemin" className="text-xl font-extrabold text-paper">Le chemin</h2>
          <p className="mt-1 text-sm text-muted">Chaque étape se débloque avec les jours validés, même s’ils ne se suivent pas.</p>
          <div className="mt-6">
            <JourneyPath journeyDays={progress.journeyDays} started={started} />
          </div>
        </section>

        <div className="min-w-0 space-y-6">
          <section aria-labelledby="calendrier" className="rounded border border-line bg-panel/80 p-5 shadow-poster">
            <h2 id="calendrier" className="text-lg font-extrabold text-paper">5 dernières semaines</h2>
            <div className="mt-4"><ActivityCalendar today={progress.today} days={progress.days} dailyGoal={progress.dailyGoal} /></div>
          </section>

          <section aria-labelledby="objectif" className="rounded border border-line bg-panel/80 p-5 shadow-poster">
            <h2 id="objectif" className="text-lg font-extrabold text-paper">Objectif quotidien</h2>
            <p className="mt-1 text-sm text-muted">L’XP à gagner dans la journée pour la valider.</p>
            <div className="mt-4"><DailyGoalPicker dailyGoal={progress.dailyGoal} /></div>
          </section>

          <section aria-labelledby="bareme" className="rounded border border-line bg-panel/80 p-5 shadow-poster">
            <h2 id="bareme" className="text-lg font-extrabold text-paper">Gagner de l’XP</h2>
            <ul className="mt-3 divide-y divide-line text-sm">
              {(Object.keys(XP_RULES) as XpReasonKey[]).map((reason) => (
                <li key={reason} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="text-paper">{XP_RULES[reason].label}</span>
                    {XP_RULES[reason].capGroup ? <span className="block text-xs text-muted">{capLabels[XP_RULES[reason].capGroup!]}</span> : null}
                  </span>
                  <span className="shrink-0 font-extrabold tabular-nums text-mint">+{XP_RULES[reason].amount}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Une même action ne rapporte qu’une fois : retirer puis remettre un like ne donne pas d’XP.</p>
          </section>

          <section aria-labelledby="historique" className="rounded border border-line bg-panel/80 p-5 shadow-poster">
            <h2 id="historique" className="text-lg font-extrabold text-paper">Derniers gains</h2>
            {progress.recentXp.length ? (
              <ul className="mt-3 divide-y divide-line text-sm">
                {progress.recentXp.map((event, index) => (
                  <li key={index} className="flex items-baseline justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="text-paper">{XP_RULES[event.reason].label}</span>
                      <span className="block text-xs text-muted">{timeFormat.format(event.createdAt)}</span>
                    </span>
                    <span className={`shrink-0 font-extrabold tabular-nums ${event.amount ? "text-mint" : "text-muted"}`}>{event.amount ? `+${event.amount}` : "plafond"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">Aucun gain pour l’instant. Ajoute un livre, like une review ou écris dans ton journal.</p>
            )}
          </section>
        </div>
      </div>

      <section id="tous-les-badges" className="mt-8 flex scroll-mt-24 flex-col gap-4">
        <h2 className="bb-h2">Tous les badges</h2>
        <p className="text-sm text-muted">Tous les badges disponibles, tes paliers obtenus et ta progression vers les suivants.</p>
        <BadgeCatalog badges={badges} />
      </section>
    </div>
  );
}
