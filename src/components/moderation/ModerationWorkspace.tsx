"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, ExternalLink, EyeOff, Flag, RotateCcw, ShieldOff, Trash2, UserX, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { timeAgo, plural } from "@/lib/format";

type ReportDossier = {
  kind: "report";
  key: string;
  targetType: "USER" | "REVIEW" | "COMMENT";
  reason: string;
  status: "OPEN" | "REVIEWING" | "CLOSED";
  title: string;
  heading: string;
  href: string | null;
  content: string | null;
  contentMeta: string;
  isHidden: boolean;
  owner: {
    handle: string;
    name: string;
    memberSince: string;
    reviewCount: number;
    hiddenCount: number;
    reportsReceived: number;
    reportsRetained: number;
    suspended: boolean;
  } | null;
  reports: Array<{ id: string; reporter: string; details: string | null; createdAt: string; status: string; decisionReason: string | null; moderatorNote: string | null }>;
  latestAt: string;
};

type LegalDossier = {
  kind: "legal";
  key: string;
  noticeId: string;
  trackingCode: string;
  status: "OPEN" | "REVIEWING" | "CLOSED";
  noticeStatus: string;
  legalGround: string;
  explanation: string;
  targetUrl: string;
  createdAt: string;
  resolvedAt: string | null;
  deadline: string;
  decisionReason: string | null;
  appeals: Array<{ id: string; reason: string; createdAt: string }>;
};

export type Dossier = ReportDossier | LegalDossier;

type Tab = "OPEN" | "REVIEWING" | "CLOSED";
type Decision = { status: "RESOLVED" | "DISMISSED"; action: "NONE" | "HIDE" | "RESTORE" | "SUSPEND" | "UNSUSPEND" };

const reasonLabels: Record<string, string> = {
  SPAM: "Spam",
  HARASSMENT: "Harcèlement",
  HATE_SPEECH: "Discours haineux",
  SPOILER: "Spoiler",
  INAPPROPRIATE_CONTENT: "Contenu inapproprié",
  OTHER: "Autre"
};

const targetLabels = { USER: "Profil", REVIEW: "Avis", COMMENT: "Commentaire" };

// Motivations types envoyées à l'auteur et aux signaleurs, selon le motif.
const motivations: Record<string, string[]> = {
  HARASSMENT: ["Attaque personnelle envers un lecteur", "Propos insultants", "Mention pour dénigrer"],
  HATE_SPEECH: ["Propos haineux envers un groupe", "Propos insultants"],
  SPAM: ["Publicité ou lien promotionnel", "Contenu répété sans rapport avec la lecture"],
  SPOILER: ["Révélation de l'intrigue sans avertissement"],
  INAPPROPRIATE_CONTENT: ["Contenu inapproprié pour la communauté"],
  OTHER: ["Contraire aux règles de la communauté"],
  DISMISS: ["Aucune règle enfreinte après examen"],
  LEGAL_REMOVE: ["Données personnelles publiées sans accord", "Contenu manifestement illicite"],
  LEGAL_DISMISS: ["Pas d'illégalité manifeste"]
};

const harmReasons = new Set(["HARASSMENT", "HATE_SPEECH", "INAPPROPRIATE_CONTENT"]);

function readablePath(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function daysLeft(deadline: string) {
  return Math.ceil((Date.parse(deadline) - Date.now()) / 86400000);
}

export function ModerationWorkspace({ dossiers }: { dossiers: Dossier[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("OPEN");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const counts = useMemo(() => ({
    OPEN: dossiers.filter((dossier) => dossier.status === "OPEN").length,
    REVIEWING: dossiers.filter((dossier) => dossier.status === "REVIEWING").length,
    CLOSED: dossiers.filter((dossier) => dossier.status === "CLOSED").length
  }), [dossiers]);

  const inTab = dossiers.filter((dossier) => dossier.status === tab);
  const legal = inTab.filter((dossier): dossier is LegalDossier => dossier.kind === "legal").sort((a, b) => a.deadline.localeCompare(b.deadline));
  const harm = inTab.filter((dossier): dossier is ReportDossier => dossier.kind === "report" && harmReasons.has(dossier.reason));
  const minor = inTab.filter((dossier): dossier is ReportDossier => dossier.kind === "report" && !harmReasons.has(dossier.reason));
  const ordered: Dossier[] = useMemo(() => [...legal, ...harm, ...minor], [legal, harm, minor]);
  const selected = ordered.find((dossier) => dossier.key === selectedKey) ?? ordered[0] ?? null;

  const move = useCallback((step: number) => {
    if (!ordered.length) return;
    const index = Math.max(0, ordered.findIndex((dossier) => dossier.key === selected?.key));
    setSelectedKey(ordered[Math.min(ordered.length - 1, Math.max(0, index + step))].key);
  }, [ordered, selected?.key]);

  async function decideReport(dossier: ReportDossier, decision: Decision | "HOLD", decisionReason: string, note: string) {
    const results = await Promise.all(
      dossier.reports
        .filter((report) => report.status === "OPEN" || report.status === "REVIEWING" || decision === "HOLD")
        .map((report, index) =>
          fetch(`/api/admin/reports/${report.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              decision === "HOLD"
                ? { status: "REVIEWING", moderatorNote: note || null, decisionReason: null, action: "NONE" }
                : { status: decision.status, moderatorNote: note || null, decisionReason, action: index === 0 ? decision.action : "NONE" }
            )
          })
        )
    );
    return results.every((response) => response.ok);
  }

  async function decideLegal(dossier: LegalDossier, status: "REVIEWING" | "RESOLVED" | "DISMISSED", decisionReason: string) {
    const response = await fetch(`/api/admin/legal-notices/${dossier.noticeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, decisionReason: decisionReason || null })
    });
    return response.ok;
  }

  async function afterDecision(ok: boolean, advance: boolean) {
    setBusy(false);
    setMessage(ok ? { tone: "success", text: "Décision enregistrée et tracée." } : { tone: "error", text: "La décision n'a pas pu être enregistrée. Vérifie la motivation." });
    if (ok) {
      if (advance) move(1);
      router.refresh();
    }
  }

  async function batch(kind: "dismiss" | "act") {
    const targets = minor.filter((dossier) => checked.has(dossier.key));
    if (!targets.length) return;
    setBusy(true);
    const results = await Promise.all(
      targets.map((dossier) =>
        decideReport(
          dossier,
          kind === "dismiss"
            ? { status: "DISMISSED", action: "NONE" }
            : { status: "RESOLVED", action: dossier.targetType === "USER" ? "SUSPEND" : "HIDE" },
          kind === "dismiss" ? motivations.DISMISS[0] : motivations[dossier.reason]?.[0] ?? motivations.OTHER[0],
          ""
        )
      )
    );
    setChecked(new Set());
    await afterDecision(results.every(Boolean), false);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "j") move(1);
      if (event.key === "k") move(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  const listItem = (dossier: Dossier, selectable: boolean) => {
    const active = dossier.key === selected?.key;
    const isLegal = dossier.kind === "legal";
    const reasonText = isLegal ? "Légal" : reasonLabels[dossier.reason];
    const title = isLegal ? dossier.legalGround : dossier.title;
    const meta = isLegal ? readablePath(dossier.targetUrl) : `${dossier.owner?.handle ?? "compte supprimé"} · ${plural(dossier.reports.length, "signalement")}`;
    const when = isLegal ? (dossier.status === "CLOSED" ? timeAgo(dossier.resolvedAt ?? dossier.createdAt) : `échéance ${Math.max(0, daysLeft(dossier.deadline))} j`) : timeAgo(dossier.latestAt).replace("il y a ", "");
    return (
      <li key={dossier.key} className={`relative flex gap-3 px-4 py-3 ${active ? "bg-ink before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-mint" : ""}`}>
        {selectable ? (
          <input
            type="checkbox"
            aria-label={`Sélectionner ${title}`}
            checked={checked.has(dossier.key)}
            onChange={() => setChecked((current) => {
              const next = new Set(current);
              if (next.has(dossier.key)) next.delete(dossier.key);
              else next.add(dossier.key);
              return next;
            })}
            className="mt-5 h-4 w-4 shrink-0 accent-[rgb(var(--c-mint))]"
          />
        ) : null}
        <button type="button" onClick={() => setSelectedKey(dossier.key)} className="min-w-0 flex-1 text-left">
          <span className="flex justify-between gap-2 text-[11px] font-bold">
            <span className={isLegal || harmReasons.has((dossier as ReportDossier).reason) ? "text-coral" : "text-muted"}>{reasonText}</span>
            <span className={isLegal && dossier.status !== "CLOSED" ? "text-mint" : "text-muted"}>{when}</span>
          </span>
          <span className="mt-0.5 block truncate text-[13px] font-extrabold text-paper">{title}</span>
          <span className="block truncate text-[11px] text-muted">{meta}</span>
        </button>
      </li>
    );
  };

  const group = (label: string, dot: string, items: Dossier[], selectable = false) =>
    items.length ? (
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="bb-label flex items-center gap-2 text-paper"><span className={`h-1.5 w-1.5 rounded-full ${dot}`} />{label}</p>
          {selectable ? (
            <button type="button" onClick={() => setChecked(new Set(items.map((item) => item.key)))} className="text-[11px] font-extrabold text-mint hover:underline">Tout sélectionner</button>
          ) : null}
        </div>
        <ul className="bb-card divide-y divide-line overflow-hidden">{items.map((item) => listItem(item, selectable))}</ul>
      </section>
    ) : null;

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-4">
        <div>
          <p className="bb-label text-coral">Administration</p>
          <h1 className="font-display text-4xl font-semibold text-paper">Modération</h1>
        </div>
        <div role="tablist" className="flex gap-5 border-b border-line">
          {([["OPEN", "À traiter"], ["REVIEWING", "En cours"], ["CLOSED", "Clôturés"]] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setSelectedKey(null); setChecked(new Set()); }} className={`bb-tab text-[15px] ${tab === id ? "bb-tab-active font-extrabold text-paper" : ""}`}>
              {label}
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${tab === id ? "bg-mint text-ink" : "bg-panelSoft text-muted"}`}>{counts[id]}</span>
            </button>
          ))}
        </div>
        {group("Légal · délai à respecter", "bg-mint", legal)}
        {group("Harcèlement & haine", "bg-coral", harm)}
        {group("Spoilers, spam & autres", "bg-sky", minor, tab !== "CLOSED")}
        {!ordered.length ? <p className="bb-card-flat p-5 text-sm text-muted">Aucun dossier dans cet onglet.</p> : null}
        {checked.size ? (
          <div className="flex items-center gap-2 rounded bg-paper px-4 py-3 text-ink">
            <span className="text-xs font-extrabold">{plural(checked.size, "sélectionné")}</span>
            <button type="button" disabled={busy} onClick={() => void batch("dismiss")} className="bb-btn ml-auto bg-ink px-3 py-1.5 text-xs text-paper">Rejeter</button>
            <button type="button" disabled={busy} onClick={() => void batch("act")} className="bb-btn bg-mint px-3 py-1.5 text-xs text-ink">Masquer / suspendre</button>
          </div>
        ) : null}
        <p className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
          <kbd className="rounded-full border border-line bg-panel px-2 py-0.5 font-bold text-paper">J</kbd> suivant
          <kbd className="rounded-full border border-line bg-panel px-2 py-0.5 font-bold text-paper">K</kbd> précédent
        </p>
      </aside>

      <div className="flex min-w-0 flex-col gap-5">
        {message ? (
          <p role="status" className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold ${message.tone === "success" ? "bg-mint/10 text-mint" : "bg-coral/10 text-coral"}`}>
            {message.text}
            <button type="button" onClick={() => setMessage(null)} aria-label="Fermer"><X size={15} /></button>
          </p>
        ) : null}
        {selected?.kind === "report" ? (
          <ReportPanel
            key={selected.key}
            dossier={selected}
            busy={busy}
            onDecide={async (decision, reason, note, advance) => {
              setBusy(true);
              await afterDecision(await decideReport(selected, decision, reason, note), advance);
            }}
          />
        ) : selected?.kind === "legal" ? (
          <LegalPanel
            key={selected.key}
            dossier={selected}
            busy={busy}
            onDecide={async (status, reason) => {
              setBusy(true);
              await afterDecision(await decideLegal(selected, status, reason), status !== "REVIEWING");
            }}
          />
        ) : (
          <div className="bb-card-flat p-8 text-center text-sm text-muted">Rien à traiter pour l&apos;instant.</div>
        )}
      </div>
    </div>
  );
}

function MotivationPicker({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  const [custom, setCustom] = useState(!options.includes(value) && Boolean(value));
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-extrabold text-paper">Motivation envoyée aux parties</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option} type="button" onClick={() => { setCustom(false); onChange(option); }} className={`bb-chip ${!custom && value === option ? "bb-chip-active" : ""}`}>{option}</button>
        ))}
        <button type="button" onClick={() => { setCustom(true); onChange(""); }} className={`bb-chip ${custom ? "bb-chip-active" : ""}`}>Autre (écrire)</button>
      </div>
      {custom ? <textarea value={value} onChange={(event) => onChange(event.target.value)} maxLength={2000} rows={2} placeholder="Motivation communiquée à l'auteur et aux signaleurs…" className="bb-input resize-y bg-ink" /> : null}
    </div>
  );
}

function DecisionCard({ active, icon: Icon, title, text, onClick }: { active: boolean; icon: typeof X; title: string; text: string; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`flex flex-col gap-1 rounded-xl border p-3.5 text-left transition ${active ? "border-mint bg-mint/[0.05] ring-1 ring-mint" : "border-line hover:border-mint/50"}`}>
      <span className="flex items-center gap-2 text-sm font-extrabold text-paper"><Icon size={15} aria-hidden />{title}</span>
      <span className="text-xs text-muted">{text}</span>
    </button>
  );
}

function ReportPanel({ dossier, busy, onDecide }: { dossier: ReportDossier; busy: boolean; onDecide: (decision: Decision | "HOLD", reason: string, note: string, advance: boolean) => Promise<void> }) {
  const isUser = dossier.targetType === "USER";
  const options: Array<{ id: string; decision: Decision; title: string; text: string; icon: typeof X }> = [
    { id: "dismiss", decision: { status: "DISMISSED", action: "NONE" }, title: "Rejeter", text: "Rien à reprocher, dossier clos.", icon: X },
    dossier.isHidden
      ? { id: "restore", decision: { status: "RESOLVED", action: isUser ? "UNSUSPEND" : "RESTORE" }, title: isUser ? "Réactiver le profil" : "Restaurer", text: isUser ? "Le compte redevient visible." : "Le contenu redevient visible.", icon: RotateCcw }
      : isUser
        ? { id: "act", decision: { status: "RESOLVED", action: "SUSPEND" }, title: "Suspendre le profil", text: "Profil et contenus masqués.", icon: UserX }
        : { id: "act", decision: { status: "RESOLVED", action: "HIDE" }, title: `Masquer ${dossier.targetType === "REVIEW" ? "l'avis" : "le commentaire"}`, text: "Le contenu disparaît, l'auteur est prévenu.", icon: EyeOff },
    { id: "close", decision: { status: "RESOLVED", action: "NONE" }, title: "Clore sans action", text: "Signalement fondé, contenu déjà traité.", icon: CheckCircle2 }
  ];
  const [choice, setChoice] = useState(dossier.status === "CLOSED" ? "" : "act");
  const chosen = options.find((option) => option.id === choice) ?? null;
  const [reason, setReason] = useState(dossier.reports[0]?.decisionReason ?? motivations[dossier.reason]?.[0] ?? "");
  const [note, setNote] = useState(dossier.reports[0]?.moderatorNote ?? "");
  const motivationOptions = choice === "dismiss" ? motivations.DISMISS : motivations[dossier.reason] ?? motivations.OTHER;

  return (
    <>
      <section className="bb-card flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-coral/10 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-coral">{reasonLabels[dossier.reason]}</span>
          <span className="rounded-full bg-panelSoft px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">{targetLabels[dossier.targetType]}</span>
          <span className="rounded-full bg-panelSoft px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-paper">{plural(dossier.reports.length, "signalement")}</span>
          {dossier.isHidden ? <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-extrabold text-muted">Déjà masqué</span> : null}
          {dossier.href ? (
            <Link href={dossier.href} className="ml-auto inline-flex items-center gap-1 text-xs font-extrabold text-mint hover:underline">
              Voir sur BooksBox <ExternalLink size={12} aria-hidden />
            </Link>
          ) : null}
        </div>
        <h2 className="bb-h2">{dossier.heading}</h2>
        {dossier.content ? (
          <div className="flex flex-col gap-3 rounded-xl bg-ink p-4">
            {dossier.owner ? (
              <p className="flex items-center gap-2 text-xs">
                <Avatar name={dossier.owner.name} size={30} />
                <span className="font-extrabold text-paper">{dossier.owner.handle}</span>
                <span className="text-muted">· {dossier.contentMeta}</span>
              </p>
            ) : null}
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-paper">{dossier.content}</p>
          </div>
        ) : null}
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        {dossier.owner ? (
          <section className="bb-card flex flex-col gap-3 p-5">
            <h3 className="bb-h3">Historique de {dossier.owner.handle}</h3>
            <p className="flex items-center gap-2 text-xs font-bold text-paper"><CalendarDays size={14} aria-hidden />Membre depuis {new Date(dossier.owner.memberSince).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} · {plural(dossier.owner.reviewCount, "avis", "avis")}</p>
            <p className={`flex items-center gap-2 text-xs font-bold ${dossier.owner.hiddenCount ? "text-coral" : "text-paper"}`}><EyeOff size={14} aria-hidden />{plural(dossier.owner.hiddenCount, "avis masqué", "avis masqués")}</p>
            <p className={`flex items-center gap-2 text-xs font-bold ${dossier.owner.reportsReceived > 1 ? "text-coral" : "text-paper"}`}><Flag size={14} aria-hidden />{plural(dossier.owner.reportsReceived, "signalement reçu", "signalements reçus")}, {dossier.owner.reportsRetained} retenu{dossier.owner.reportsRetained > 1 ? "s" : ""}</p>
            <p className="flex items-center gap-2 text-xs font-bold text-paper"><ShieldOff size={14} aria-hidden />{dossier.owner.suspended ? "Actuellement suspendu" : "Jamais suspendu"}</p>
          </section>
        ) : null}
        <section className="bb-card flex flex-col gap-3 p-5">
          <h3 className="bb-h3">{dossier.reports.length > 1 ? `Les ${dossier.reports.length} signalements` : "Le signalement"}</h3>
          {dossier.reports.map((report) => (
            <div key={report.id}>
              <p className="text-xs"><span className="font-extrabold text-paper">{report.reporter}</span><span className="text-muted"> · {timeAgo(report.createdAt)}</span></p>
              <p className="text-xs text-muted">{report.details ?? "Sans précision"}</p>
            </div>
          ))}
        </section>
      </div>

      <section className="bb-card flex flex-col gap-4 p-6">
        <h3 className="bb-h3 text-xl">Décision</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {options.map((option) => (
            <DecisionCard key={option.id} active={choice === option.id} icon={option.icon} title={option.title} text={option.text} onClick={() => {
              setChoice(option.id);
              setReason((option.id === "dismiss" ? motivations.DISMISS : motivations[dossier.reason] ?? motivations.OTHER)[0]);
            }} />
          ))}
        </div>
        <MotivationPicker key={choice} options={motivationOptions} value={reason} onChange={setReason} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor={`note-${dossier.key}`}>Note interne</label>
          <input id={`note-${dossier.key}`} value={note} onChange={(event) => setNote(event.target.value)} maxLength={1200} placeholder="Note interne (visible des modérateurs seulement)" className="bb-input flex-1 bg-ink" />
          {dossier.status !== "REVIEWING" ? (
            <button type="button" disabled={busy} onClick={() => void onDecide("HOLD", "", note, false)} className="bb-btn-ghost text-paper">Mettre en attente</button>
          ) : null}
          <button type="button" disabled={busy || !chosen || !reason.trim()} onClick={() => chosen && void onDecide(chosen.decision, reason.trim(), note, true)} className="bb-btn-primary px-5 py-2.5 text-sm">
            Décider et passer au suivant
          </button>
        </div>
      </section>
    </>
  );
}

function LegalPanel({ dossier, busy, onDecide }: { dossier: LegalDossier; busy: boolean; onDecide: (status: "REVIEWING" | "RESOLVED" | "DISMISSED", reason: string) => Promise<void> }) {
  const [choice, setChoice] = useState<"RESOLVED" | "DISMISSED">("RESOLVED");
  const [reason, setReason] = useState(dossier.decisionReason ?? motivations.LEGAL_REMOVE[0]);
  const left = daysLeft(dossier.deadline);

  return (
    <>
      <section className="bb-card flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-coral/10 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-coral">Notification légale</span>
          <span className="text-xs text-muted">Dossier {dossier.trackingCode}</span>
          {dossier.status !== "CLOSED" ? (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1 text-[11px] font-extrabold text-ink">
              <Clock size={12} aria-hidden />
              {left >= 0 ? `Échéance dans ${plural(left, "jour")}` : `Échéance dépassée de ${plural(-left, "jour")}`} · {new Date(dossier.deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            </span>
          ) : null}
        </div>
        <h2 className="bb-h2">{dossier.legalGround}</h2>
        <div className="flex items-center gap-3 rounded-xl bg-ink p-4">
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-extrabold text-paper">Contenu visé</span>
            <span className="block truncate text-xs text-muted">{readablePath(dossier.targetUrl)}</span>
          </span>
          <a href={dossier.targetUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs font-extrabold text-mint hover:underline">Ouvrir <ExternalLink size={12} aria-hidden /></a>
        </div>
        <div>
          <p className="text-xs font-extrabold text-paper">Explication du déclarant</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-paper">{dossier.explanation}</p>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="bb-card flex flex-col gap-3 p-5">
          <h3 className="bb-h3">Suivi du dossier</h3>
          <p className="flex gap-2 text-xs"><CheckCircle2 size={15} aria-hidden className="text-mint" /><span><span className="block font-extrabold text-paper">Reçue</span><span className="text-muted">{new Date(dossier.createdAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · accusé envoyé au déclarant</span></span></p>
          <p className="flex gap-2 text-xs">{dossier.noticeStatus === "OPEN" ? <Clock size={15} aria-hidden className="text-muted" /> : <CheckCircle2 size={15} aria-hidden className="text-mint" />}<span><span className="block font-extrabold text-paper">En examen</span><span className="text-muted">{dossier.noticeStatus === "OPEN" ? "pas encore ouvert" : "pris en charge"}</span></span></p>
          <p className="flex gap-2 text-xs">{dossier.resolvedAt ? <CheckCircle2 size={15} aria-hidden className="text-mint" /> : <Clock size={15} aria-hidden className="text-muted" />}<span><span className="block font-extrabold text-paper">Décision motivée</span><span className="text-muted">{dossier.resolvedAt ? `envoyée le ${new Date(dossier.resolvedAt).toLocaleDateString("fr-FR")}` : `à envoyer avant le ${new Date(dossier.deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`}</span></span></p>
        </section>
        <section className="bb-card flex flex-col gap-3 p-5">
          <h3 className="bb-h3">Contestations</h3>
          {dossier.appeals.length ? (
            dossier.appeals.map((appeal) => (
              <div key={appeal.id}>
                <p className="text-[11px] text-muted">{timeAgo(appeal.createdAt)}</p>
                <p className="text-xs text-paper">{appeal.reason}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted">Aucune pour l&apos;instant. Si l&apos;auteur ou le déclarant conteste, elle apparaîtra ici avec son motif.</p>
          )}
        </section>
      </div>

      <section className="bb-card flex flex-col gap-4 p-6">
        <h3 className="bb-h3 text-xl">Décision</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <DecisionCard active={choice === "RESOLVED"} icon={Trash2} title="Retirer le contenu" text="Notification fondée : le contenu est retiré, le déclarant est prévenu." onClick={() => { setChoice("RESOLVED"); setReason(motivations.LEGAL_REMOVE[0]); }} />
          <DecisionCard active={choice === "DISMISSED"} icon={X} title="Rejeter la notification" text="Pas d'illégalité manifeste." onClick={() => { setChoice("DISMISSED"); setReason(motivations.LEGAL_DISMISS[0]); }} />
        </div>
        <MotivationPicker key={choice} options={choice === "RESOLVED" ? motivations.LEGAL_REMOVE : motivations.LEGAL_DISMISS} value={reason} onChange={setReason} />
        <p className="text-[11px] text-muted">Le retrait effectif du contenu se fait depuis le contenu lui-même (masquage ou suspension), puis la décision est envoyée ici.</p>
        <div className="flex flex-wrap justify-end gap-3">
          {dossier.noticeStatus === "OPEN" ? (
            <button type="button" disabled={busy} onClick={() => void onDecide("REVIEWING", "")} className="bb-btn-ghost text-paper">Mettre en attente</button>
          ) : null}
          <button type="button" disabled={busy || !reason.trim()} onClick={() => void onDecide(choice, reason.trim())} className="bb-btn-primary px-5 py-2.5 text-sm">Décider et envoyer</button>
        </div>
      </section>
    </>
  );
}
