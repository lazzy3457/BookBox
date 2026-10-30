"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  EyeOff,
  FileUp,
  LockKeyhole,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  UserRound,
  UserX
} from "lucide-react";
import { signOut } from "next-auth/react";
import { FormEvent, useState } from "react";
import { Toast } from "@/components/ui/Toast";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeId, themes } from "@/lib/themes";

type Profile = {
  name: string | null; username: string | null; email: string | null;
  emailVerified: string | Date | null; image: string | null; bio: string | null; createdAt: string | Date;
};
type Notifications = {
  enabled: boolean; likesEnabled: boolean; commentsEnabled: boolean;
  friendReviewsEnabled: boolean; followersEnabled: boolean; groupsEnabled: boolean;
};
export type SettingsSection = "profil" | "securite" | "lecture" | "notifications" | "confidentialite" | "bloques" | "importer" | "donnees";
type Props = {
  section: SettingsSection;
  profile: Profile;
  hasPassword: boolean;
  hideSpoilers: boolean;
  theme: ThemeId;
  notifications: Notifications;
  blockedCount: number;
  slots: { blocked: React.ReactNode; importer: React.ReactNode; data: React.ReactNode };
};
type ToastState = { message: string; tone: "success" | "error" | "info" } | null;

function errorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string") return error;
    if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
      return (error as { message: string }).message;
    }
  }
  return fallback;
}

function applyTheme(theme: ThemeId) {
  document.documentElement.setAttribute("data-theme", theme);
}

function Switch({ checked, disabled, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={onChange}
      className={`relative h-[26px] w-[46px] shrink-0 rounded-full border transition ${checked ? "border-mint bg-mint" : "border-line bg-panelSoft/60"} disabled:cursor-not-allowed disabled:opacity-40`}>
      <span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition ${checked ? "left-[23px]" : "left-[3px]"}`} />
    </button>
  );
}

const notificationRows: Array<[keyof Notifications, string, string]> = [
  ["likesEnabled", "J'aime", "Quand on aime ton avis ou ton commentaire."],
  ["commentsEnabled", "Commentaires et réponses", "Les discussions sous tes avis."],
  ["friendReviewsEnabled", "Avis de tes amis", "Quand un compte suivi publie un avis."],
  ["followersEnabled", "Nouveaux abonnés", "Quand quelqu'un te suit."],
  ["groupsEnabled", "Activité de mes groupes", "Réponses à tes messages, mentions et invitations. La cloche d'un groupe ajoute ses nouvelles discussions."]
];

export function SettingsWorkspace({ section, profile: initialProfile, hasPassword, hideSpoilers: initialSpoilers, theme: initialTheme, notifications: initialNotifications, blockedCount, slots }: Props) {
  const router = useRouter();
  const savedProfile = {
    name: initialProfile.name ?? "", username: initialProfile.username ?? "",
    bio: initialProfile.bio ?? "", image: initialProfile.image ?? ""
  };
  const [baseline, setBaseline] = useState(savedProfile);
  const [profile, setProfile] = useState(savedProfile);
  const [profileSaving, setProfileSaving] = useState(false);
  const [hideSpoilers, setHideSpoilers] = useState(initialSpoilers);
  const [theme, setTheme] = useState(initialTheme);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [pendingNotification, setPendingNotification] = useState<keyof Notifications | null>(null);
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmation: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const activeNotifications = notificationRows.filter(([key]) => notifications[key]).length;
  const dirtyFields = (Object.keys(profile) as Array<keyof typeof profile>).filter((key) => profile[key] !== baseline[key]).length;

  const groups: Array<{ label: string; items: Array<{ id: SettingsSection; label: string; hint: string; icon: typeof UserRound; alert?: boolean }> }> = [
    {
      label: "Compte",
      items: [
        { id: "profil", label: "Profil", hint: "Nom, pseudo, photo, bio", icon: UserRound },
        { id: "securite", label: "Connexion & sécurité", hint: initialProfile.emailVerified ? "E-mail, mot de passe" : "E-mail à vérifier", icon: LockKeyhole, alert: !initialProfile.emailVerified }
      ]
    },
    {
      label: "Expérience",
      items: [
        { id: "lecture", label: "Lecture & apparence", hint: "Spoilers, thème", icon: BookOpen },
        { id: "notifications", label: "Notifications", hint: notifications.enabled ? `${activeNotifications} sur ${notificationRows.length} actives` : "Désactivées", icon: Bell }
      ]
    },
    {
      label: "Vie privée",
      items: [
        { id: "confidentialite", label: "Confidentialité", hint: "Profil, journal", icon: ShieldCheck },
        { id: "bloques", label: "Comptes bloqués", hint: blockedCount ? `${blockedCount} compte${blockedCount > 1 ? "s" : ""}` : "Aucun", icon: UserX }
      ]
    },
    {
      label: "Données",
      items: [
        { id: "importer", label: "Importer", hint: "Goodreads (CSV)", icon: FileUp },
        { id: "donnees", label: "Exporter ou supprimer", hint: "Ton compte, tes données", icon: Download }
      ]
    }
  ];
  const current = groups.flatMap((group) => group.items).find((item) => item.id === section)!;

  const descriptions: Record<SettingsSection, string> = {
    profil: "Ce que les autres lecteurs voient sur ta page et à côté de tes avis.",
    securite: "Ton adresse de connexion et ton mot de passe.",
    lecture: "Comment BooksBox s'affiche et ce qu'il te cache.",
    notifications: "Chaque changement est enregistré tout de suite.",
    confidentialite: "Ce qui est visible par les autres et ce qui reste à toi.",
    bloques: "Les comptes bloqués ne peuvent plus interagir avec toi, dans les deux sens.",
    importer: "Récupère ta bibliothèque depuis Goodreads ou un export BooksBox.",
    donnees: "Tes données t'appartiennent : récupère-les ou pars quand tu veux."
  };

  async function saveProfile(event?: FormEvent) {
    event?.preventDefault(); setProfileSaving(true);
    try {
      const response = await fetch("/api/settings/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
      const payload = await response.json();
      if (!response.ok) throw new Error(errorMessage(payload, "Impossible d’enregistrer le profil."));
      const next = { name: payload.profile.name ?? "", username: payload.profile.username ?? "", bio: payload.profile.bio ?? "", image: payload.profile.image ?? "" };
      setProfile(next);
      setBaseline(next);
      setToast({ message: "Profil enregistré.", tone: "success" });
    } catch (error) { setToast({ message: error instanceof Error ? error.message : "Une erreur est survenue.", tone: "error" }); }
    finally { setProfileSaving(false); }
  }

  async function toggleSpoilers() {
    const previous = hideSpoilers; const next = !previous; setHideSpoilers(next);
    try {
      const response = await fetch("/api/settings/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hideSpoilers: next }) });
      if (!response.ok) throw new Error();
      setToast({ message: next ? "Les spoilers seront masqués." : "Les spoilers seront affichés.", tone: "success" });
    } catch { setHideSpoilers(previous); setToast({ message: "La préférence n’a pas pu être enregistrée.", tone: "error" }); }
  }

  async function selectTheme(next: ThemeId) {
    const previous = theme;
    if (next === previous) return;
    setTheme(next); applyTheme(next);
    try {
      const response = await fetch("/api/settings/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: next }) });
      if (!response.ok) throw new Error();
      setToast({ message: "Thème mis à jour.", tone: "success" });
    } catch {
      setTheme(previous); applyTheme(previous);
      setToast({ message: "Le thème n’a pas pu être enregistré.", tone: "error" });
    }
  }

  async function toggleNotification(key: keyof Notifications) {
    const previous = notifications; const next = { ...previous, [key]: !previous[key] };
    setNotifications(next); setPendingNotification(key);
    try {
      const response = await fetch("/api/mobile/notification-preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: next[key] }) });
      if (!response.ok) throw new Error();
      const payload = await response.json(); setNotifications(payload.preferences);
    } catch { setNotifications(previous); setToast({ message: "La modification n’a pas pu être enregistrée.", tone: "error" }); }
    finally { setPendingNotification(null); }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault(); setPasswordSaving(true);
    try {
      const response = await fetch("/api/settings/password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(password) });
      const payload = await response.json();
      if (!response.ok) throw new Error(errorMessage(payload, "Impossible de modifier le mot de passe."));
      setToast({ message: "Mot de passe modifié. Reconnexion nécessaire.", tone: "success" });
      window.setTimeout(() => signOut({ callbackUrl: "/login?passwordChanged=1" }), 900);
    } catch (error) { setToast({ message: error instanceof Error ? error.message : "Une erreur est survenue.", tone: "error" }); setPasswordSaving(false); }
  }

  async function requestPasswordSetup() {
    setPasswordSaving(true);
    try {
      const response = await fetch("/api/settings/password", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(errorMessage(payload, "Impossible d’envoyer le lien."));
      setToast({ message: `Lien envoyé à ${initialProfile.email}. Il expire dans 30 minutes.`, tone: "success" });
    } catch (error) { setToast({ message: error instanceof Error ? error.message : "Une erreur est survenue.", tone: "error" }); }
    finally { setPasswordSaving(false); }
  }

  const label = "flex flex-col gap-2 text-xs font-extrabold text-paper";
  const field = "bb-input bg-ink focus:bg-panel";

  let content: React.ReactNode;
  if (section === "profil") {
    content = (
      <form onSubmit={saveProfile} className="flex flex-col gap-5">
        <div className="bb-card flex flex-col gap-5 p-4 sm:p-6 sm:flex-row sm:items-center">
          <Avatar name={profile.name || "?"} image={profile.image || null} size={76} className="border-2 border-line font-display text-2xl" />
          <div className="min-w-0 flex-1">
            <p className="bb-h3">Photo de profil</p>
            <label className="mt-2 flex flex-col gap-1 text-xs text-muted">
              Adresse d&apos;une image (https://…)
              <input type="url" maxLength={500} autoComplete="photo" placeholder="https://…" className={field} value={profile.image} onChange={(e) => setProfile({ ...profile, image: e.target.value })} />
            </label>
          </div>
          {profile.image ? <button type="button" onClick={() => setProfile({ ...profile, image: "" })} className="bb-btn-ghost text-paper">Retirer</button> : null}
        </div>
        <div className="bb-card grid gap-5 p-4 sm:p-6 sm:grid-cols-2">
          <label className={label}>Nom affiché<input required minLength={2} maxLength={80} autoComplete="name" className={field} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></label>
          <label className={label}>Pseudo
            <input required minLength={3} maxLength={32} autoComplete="username" className={field} value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value.toLowerCase() })} />
            <span className="text-[11px] font-normal text-muted">Visible comme @{profile.username || "pseudo"}</span>
          </label>
          <label className={`${label} sm:col-span-2`}>Bio
            <textarea maxLength={500} rows={3} className={`${field} resize-y`} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
            <span className="text-[11px] font-normal text-muted">{profile.bio.length} / 500</span>
          </label>
        </div>
        {dirtyFields ? (
          <div className="sticky bottom-24 z-10 flex items-center gap-3 rounded bg-paper px-4 py-3 sm:px-5 sm:py-3.5 text-ink shadow-poster lg:bottom-6">
            <span aria-hidden className="h-2 w-2 rounded-full bg-coral" />
            <span className="text-[13px] font-extrabold">{dirtyFields} modification{dirtyFields > 1 ? "s" : ""} non enregistrée{dirtyFields > 1 ? "s" : ""}</span>
            <button type="button" onClick={() => setProfile(baseline)} className="ml-auto text-[13px] font-extrabold text-ink/75 hover:text-ink">Annuler</button>
            <button disabled={profileSaving} className="bb-btn bg-mint px-4 py-2 text-ink hover:bg-lime">{profileSaving ? "Enregistrement…" : "Enregistrer"}</button>
          </div>
        ) : null}
      </form>
    );
  } else if (section === "securite") {
    content = (
      <div className="flex flex-col gap-5">
        <div className="bb-card flex flex-wrap items-center gap-3 p-4 sm:p-6 text-sm">
          <span className="font-extrabold text-paper">{initialProfile.email}</span>
          {initialProfile.emailVerified ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-mint"><CheckCircle2 size={14} aria-hidden />E-mail vérifié</span>
          ) : (
            <span className="text-xs font-bold text-coral">E-mail à vérifier : clique sur le lien reçu par e-mail.</span>
          )}
          <p className="w-full text-xs text-muted">L’adresse du compte n’est pas modifiable dans cette version.</p>
        </div>
        {hasPassword ? (
          <form onSubmit={changePassword} className="bb-card grid gap-4 p-4 sm:p-6 sm:grid-cols-2">
            <h2 className="bb-h3 sm:col-span-2">Changer de mot de passe</h2>
            <label className={`${label} sm:col-span-2`}>Mot de passe actuel<input type="password" required autoComplete="current-password" className={field} value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} /></label>
            <label className={label}>Nouveau mot de passe<input type="password" required minLength={10} autoComplete="new-password" className={field} value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} /></label>
            <label className={label}>Confirmation<input type="password" required minLength={10} autoComplete="new-password" className={field} value={password.confirmation} onChange={(e) => setPassword({ ...password, confirmation: e.target.value })} /></label>
            <div className="sm:col-span-2"><button disabled={passwordSaving} className="bb-btn-primary px-5 py-2.5 text-sm">{passwordSaving ? "Modification…" : "Changer le mot de passe"}</button></div>
          </form>
        ) : (
          <div className="bb-card flex flex-col items-start gap-3 p-4 sm:p-6">
            <h2 className="bb-h3">Définir un mot de passe</h2>
            <p className="text-sm text-muted">Ton compte se connecte avec Google et n’a pas encore de mot de passe. Reçois un lien par e-mail pour en choisir un : tu pourras ensuite te connecter aussi avec ton adresse.</p>
            <button type="button" disabled={passwordSaving} onClick={requestPasswordSetup} className="bb-btn-primary px-5 py-2.5 text-sm">{passwordSaving ? "Envoi…" : "Recevoir le lien"}</button>
          </div>
        )}
      </div>
    );
  } else if (section === "lecture") {
    content = (
      <div className="flex flex-col gap-5">
        <div className="bb-card flex items-center justify-between gap-4 p-4 sm:p-6">
          <div className="flex gap-3"><EyeOff size={18} aria-hidden className="mt-0.5 text-mint" /><div><h2 className="text-[15px] font-extrabold text-paper">Masquer les spoilers</h2><p className="mt-1 text-xs text-muted">Cache les avis signalés comme sensibles jusqu’à ce que tu les révèles.</p></div></div>
          <Switch checked={hideSpoilers} label="Masquer les spoilers" onChange={toggleSpoilers} />
        </div>
        <div className="bb-card p-4 sm:p-6">
          <h2 className="bb-h3">Apparence</h2>
          <p className="mt-1 text-xs text-muted">Choisis l’ambiance de ta bibliothèque.</p>
          <div role="radiogroup" aria-label="Thème" className="mt-4 grid gap-3 sm:grid-cols-2">
            {themes.map((option) => (
              <button key={option.id} type="button" role="radio" aria-checked={theme === option.id} onClick={() => selectTheme(option.id)}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${theme === option.id ? "border-mint bg-mint/[0.06] ring-1 ring-mint" : "border-line bg-ink hover:border-mint/50"}`}>
                <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full ${option.id === "nuit" ? "bg-[#0b1620] text-[#00d474]" : "bg-[#f5ede1] text-[#7a2e3a]"} border border-line`}>
                  {option.id === "nuit" ? <Moon size={18} /> : <Sun size={18} />}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-paper">
                    {option.label}
                    {option.premium ? <span className="rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber">Premium</span> : null}
                  </span>
                  <span className="mt-1 block text-xs text-muted">{option.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  } else if (section === "notifications") {
    content = (
      <div className="flex flex-col gap-5">
        <div className="bb-card flex items-center justify-between gap-4 p-4 sm:p-6">
          <div className="flex gap-3"><Bell size={18} aria-hidden className="mt-0.5 text-muted" /><div><h2 className="text-[15px] font-extrabold text-paper">Toutes les notifications</h2><p className="mt-1 text-xs text-muted">Coupe ou réactive tout d’un coup.</p></div></div>
          <Switch checked={notifications.enabled} disabled={pendingNotification !== null} label="Toutes les notifications" onChange={() => toggleNotification("enabled")} />
        </div>
        <div className="bb-card p-4 sm:p-6">
          <h2 className="bb-h3 border-b border-line pb-3">Social</h2>
          <div className="divide-y divide-line">
            {notificationRows.map(([key, title, description]) => (
              <div key={key} className={`flex items-center justify-between gap-4 py-4 transition ${notifications.enabled ? "" : "opacity-45"}`}>
                <div><h3 className="text-sm font-extrabold text-paper">{title}</h3><p className="mt-0.5 text-xs text-muted">{description}</p></div>
                <Switch checked={notifications[key]} disabled={!notifications.enabled || pendingNotification !== null} label={title} onChange={() => toggleNotification(key)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  } else if (section === "confidentialite") {
    content = (
      <div className="bb-card flex flex-col gap-4 p-4 sm:p-6 text-sm leading-relaxed text-paper">
        <p>Ton profil, tes avis et tes listes publiques sont visibles par la communauté. Les entrées de ton journal sont <strong>privées par défaut</strong> : tu choisis entrée par entrée celles que tu partages.</p>
        <p className="text-muted">Sur ton profil public, seuls ton niveau et tes badges apparaissent ; ton XP détaillée, ta série et ton calendrier d’activité restent privés.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="?rubrique=bloques" className="bb-btn-soft">Gérer les comptes bloqués</Link>
          <Link href="/confidentialite" className="bb-btn-ghost">Lire la politique de confidentialité</Link>
        </div>
      </div>
    );
  } else if (section === "bloques") {
    content = slots.blocked;
  } else if (section === "importer") {
    content = slots.importer;
  } else {
    content = slots.data;
  }

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-5 sm:gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-4 sm:gap-5 lg:sticky lg:top-24">
          <h1 className="bb-page-title">Paramètres</h1>
          {/* Sous 1024px, un menu déroulant natif remplace la liste des rubriques. */}
          <label className="relative lg:hidden">
            <span className="sr-only">Rubrique</span>
            <select value={section} onChange={(event) => router.push(`/settings?rubrique=${event.target.value}`)} className="bb-input appearance-none py-3 pr-10 font-extrabold">
              {groups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.items.map((item) => <option key={item.id} value={item.id}>{item.label}{item.alert ? " · à vérifier" : ""}</option>)}
                </optgroup>
              ))}
            </select>
            <ChevronDown size={16} aria-hidden className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
          </label>
          <nav aria-label="Rubriques des paramètres" className="hidden flex-col gap-4 lg:flex">
            {groups.map((group) => (
              <div key={group.label} className="flex flex-col gap-1">
                <p className="bb-label pb-1 text-coral">{group.label}</p>
                {group.items.map((item) => {
                  const active = item.id === section;
                  return (
                    <Link key={item.id} href={`/settings?rubrique=${item.id}`} aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-2.5 py-2 transition ${active ? "bg-panel shadow-poster" : "hover:bg-panel/60"}`}>
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${active ? "bg-mint text-ink" : "bg-panelSoft/70 text-paper"}`}><item.icon size={15} aria-hidden /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-extrabold text-paper">{item.label}</span>
                        <span className={`block truncate text-[11px] ${item.alert ? "font-bold text-coral" : "text-muted"}`}>{item.hint}</span>
                      </span>
                      {active ? <ChevronRight size={15} aria-hidden className="text-paper" /> : item.alert ? <span aria-hidden className="h-2 w-2 rounded-full bg-coral" /> : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="hidden flex-col gap-3 rounded bg-panelSoft/60 p-4 lg:flex">
            <p className="bb-label text-muted">Réglages rapides</p>
            <div className="flex items-center justify-between gap-3 text-xs font-extrabold text-paper">
              <span className="inline-flex items-center gap-2"><EyeOff size={14} aria-hidden />Masquer les spoilers</span>
              <Switch checked={hideSpoilers} label="Masquer les spoilers" onChange={toggleSpoilers} />
            </div>
            <div className="flex items-center justify-between gap-3 text-xs font-extrabold text-paper">
              <span className="inline-flex items-center gap-2"><Bell size={14} aria-hidden />Notifications</span>
              <Switch checked={notifications.enabled} disabled={pendingNotification !== null} label="Notifications" onChange={() => toggleNotification("enabled")} />
            </div>
          </div>
          <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="hidden w-fit items-center gap-2 px-2 text-[13px] font-extrabold text-coral hover:underline lg:inline-flex">
            <LogOut size={15} aria-hidden />
            Se déconnecter
          </button>
        </aside>

        <section className="flex min-w-0 flex-col gap-4 sm:gap-5">
          <div>
            <p className="hidden items-center gap-1.5 text-xs font-bold text-muted lg:flex">Paramètres <ChevronRight size={13} aria-hidden /> <span className="text-paper">{current.label}</span></p>
            <h2 className="font-display text-2xl font-semibold text-paper sm:text-3xl lg:mt-3">{current.label}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted sm:text-sm">
              {section === "notifications" ? <CheckCircle2 size={14} aria-hidden className="text-mint" /> : null}
              {descriptions[section]}
            </p>
          </div>
          {content}
        </section>
      </div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  );
}
