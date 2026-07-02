"use client";

import { Bell, CheckCircle2, EyeOff, LockKeyhole, Moon, Save, UserRound } from "lucide-react";
import { signOut } from "next-auth/react";
import { FormEvent, useEffect, useState } from "react";
import { Toast } from "@/components/ui/Toast";

type Profile = {
  name: string | null; username: string | null; email: string | null;
  emailVerified: string | Date | null; image: string | null; bio: string | null; createdAt: string | Date;
};
type Notifications = {
  enabled: boolean; likesEnabled: boolean; commentsEnabled: boolean;
  friendReviewsEnabled: boolean; followersEnabled: boolean;
};
type Props = { profile: Profile; hideSpoilers: boolean; notifications: Notifications };
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

const nav = [
  ["profil", "Profil"], ["preferences", "Préférences"], ["notifications", "Notifications"],
  ["confidentialite", "Confidentialité"], ["donnees-securite", "Données & sécurité"]
];

function Switch({ checked, disabled, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full border transition ${checked ? "border-mint bg-mint" : "border-line bg-ink"} disabled:cursor-not-allowed disabled:opacity-40`}>
      <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white transition ${checked ? "left-[25px]" : "left-[3px]"}`} />
    </button>
  );
}

export function SettingsWorkspace({ profile: initialProfile, hideSpoilers: initialSpoilers, notifications: initialNotifications }: Props) {
  const [active, setActive] = useState("profil");
  const [profile, setProfile] = useState({
    name: initialProfile.name ?? "", username: initialProfile.username ?? "",
    bio: initialProfile.bio ?? "", image: initialProfile.image ?? ""
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [hideSpoilers, setHideSpoilers] = useState(initialSpoilers);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [pendingNotification, setPendingNotification] = useState<keyof Notifications | null>(null);
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmation: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.2, 0.6] });
    nav.forEach(([id]) => { const element = document.getElementById(id); if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, []);

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); setProfileSaving(true);
    try {
      const response = await fetch("/api/settings/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
      const payload = await response.json();
      if (!response.ok) throw new Error(errorMessage(payload, "Impossible d’enregistrer le profil."));
      setProfile({ name: payload.profile.name ?? "", username: payload.profile.username ?? "", bio: payload.profile.bio ?? "", image: payload.profile.image ?? "" });
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

  async function toggleNotification(key: keyof Notifications) {
    const previous = notifications; const next = { ...previous, [key]: !previous[key] };
    setNotifications(next); setPendingNotification(key);
    try {
      const response = await fetch("/api/mobile/notification-preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: next[key] }) });
      if (!response.ok) throw new Error();
      const payload = await response.json(); setNotifications(payload.preferences);
      setToast({ message: "Préférences de notification mises à jour.", tone: "success" });
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

  const field = "mt-2 w-full rounded border border-line bg-ink px-4 py-3 text-paper outline-none transition focus:border-mint";
  const section = "scroll-mt-28 rounded border border-line bg-panel/80 p-5 shadow-poster sm:p-7";
  const notificationRows: Array<[keyof Notifications, string, string]> = [
    ["likesEnabled", "Likes", "Quand quelqu’un aime une review ou un commentaire."],
    ["commentsEnabled", "Commentaires et réponses", "Les nouvelles discussions sur tes reviews."],
    ["friendReviewsEnabled", "Reviews des amis", "Lorsqu’un compte suivi publie une review."],
    ["followersEnabled", "Nouveaux followers", "Quand une personne commence à te suivre."]
  ];

  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <nav aria-label="Sections des paramètres" className="sticky top-16 z-20 -mx-3 overflow-x-auto border-y border-line bg-ink/95 px-3 py-3 backdrop-blur lg:mx-0 lg:rounded lg:border lg:bg-panel/80 lg:p-3">
          <div className="flex min-w-max gap-2 lg:block lg:min-w-0 lg:space-y-1">
            {nav.map(([id, label]) => <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined}
              className={`block rounded px-3 py-2.5 text-sm font-bold transition ${active === id ? "bg-mint text-ink" : "text-muted hover:bg-white/5 hover:text-paper"}`}>{label}</a>)}
          </div>
        </nav>

        <div className="space-y-6">
          <section id="profil" className={section}>
            <div className="flex items-center gap-3"><UserRound className="text-mint" /><div><h2 className="text-xl font-black text-paper">Profil</h2><p className="text-sm text-muted">Les informations visibles par les autres lecteurs.</p></div></div>
            <form onSubmit={saveProfile} className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-bold text-paper">Nom affiché<input required minLength={2} maxLength={80} autoComplete="name" className={field} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></label>
              <label className="text-sm font-bold text-paper">Pseudo<input required minLength={3} maxLength={32} autoComplete="username" className={field} value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value.toLowerCase() })} /></label>
              <label className="text-sm font-bold text-paper sm:col-span-2">URL de l’avatar<input type="url" maxLength={500} autoComplete="photo" placeholder="https://…" className={field} value={profile.image} onChange={(e) => setProfile({ ...profile, image: e.target.value })} /></label>
              <label className="text-sm font-bold text-paper sm:col-span-2">Bio<textarea maxLength={500} rows={4} className={field} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} /><span className="mt-1 block text-right text-xs font-normal text-muted">{profile.bio.length}/500</span></label>
              <div className="sm:col-span-2"><button disabled={profileSaving} className="inline-flex items-center gap-2 rounded bg-mint px-5 py-3 font-black text-ink disabled:opacity-60"><Save size={17} />{profileSaving ? "Enregistrement…" : "Enregistrer le profil"}</button></div>
            </form>
          </section>

          <section id="preferences" className={section}>
            <h2 className="text-xl font-black text-paper">Préférences</h2>
            <div className="mt-5 divide-y divide-line rounded border border-line">
              <div className="flex items-center justify-between gap-4 p-4"><div className="flex gap-3"><EyeOff className="text-mint" /><div><h3 className="font-bold text-paper">Masquer les spoilers</h3><p className="mt-1 text-sm text-muted">Cache les reviews signalées comme sensibles jusqu’à ton action.</p></div></div><Switch checked={hideSpoilers} label="Masquer les spoilers" onChange={toggleSpoilers} /></div>
              <div className="flex gap-3 p-4"><Moon className="text-sky" /><div><h3 className="font-bold text-paper">Apparence sombre</h3><p className="mt-1 text-sm text-muted">Le thème sombre est l’apparence officielle de cette version de BooksBox.</p></div></div>
            </div>
          </section>

          <section id="notifications" className={section}>
            <div className="flex items-center gap-3"><Bell className="text-mint" /><div><h2 className="text-xl font-black text-paper">Notifications</h2><p className="text-sm text-muted">Chaque modification est enregistrée immédiatement.</p></div></div>
            <div className="mt-5 divide-y divide-line rounded border border-line">
              <div className="flex items-center justify-between gap-4 p-4"><div><h3 className="font-black text-paper">Toutes les notifications</h3><p className="mt-1 text-sm text-muted">Coupe ou réactive l’ensemble des alertes.</p></div><Switch checked={notifications.enabled} disabled={pendingNotification !== null} label="Toutes les notifications" onChange={() => toggleNotification("enabled")} /></div>
              {notificationRows.map(([key, title, description]) => <div key={key} className={`flex items-center justify-between gap-4 p-4 transition ${notifications.enabled ? "" : "opacity-45"}`}><div><h3 className="font-bold text-paper">{title}</h3><p className="mt-1 text-sm text-muted">{description}</p></div><Switch checked={notifications[key]} disabled={!notifications.enabled || pendingNotification !== null} label={title} onChange={() => toggleNotification(key)} /></div>)}
            </div>
          </section>

          <section id="confidentialite" className={section}>
            <h2 className="text-xl font-black text-paper">Confidentialité</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Les entrées du journal sont privées par défaut. Tu gardes le contrôle sur leur visibilité et sur les comptes avec lesquels tu interagis.</p>
            <a href="#comptes-bloques" className="mt-4 inline-block font-bold text-mint hover:underline">Gérer les comptes bloqués ↓</a>
          </section>

          <section id="donnees-securite" className={section}>
            <div className="flex items-center gap-3"><LockKeyhole className="text-coral" /><div><h2 className="text-xl font-black text-paper">Sécurité du compte</h2><p className="text-sm text-muted">L’e-mail du compte n’est pas modifiable dans cette version.</p></div></div>
            <div className="mt-5 rounded border border-line bg-ink/50 p-4 text-sm text-muted"><span className="font-bold text-paper">{initialProfile.email}</span><span className="ml-2 inline-flex items-center gap-1 text-mint"><CheckCircle2 size={14} /> E-mail vérifié</span></div>
            <form onSubmit={changePassword} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold text-paper sm:col-span-2">Mot de passe actuel<input type="password" required autoComplete="current-password" className={field} value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} /></label>
              <label className="text-sm font-bold text-paper">Nouveau mot de passe<input type="password" required minLength={10} autoComplete="new-password" className={field} value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} /></label>
              <label className="text-sm font-bold text-paper">Confirmation<input type="password" required minLength={10} autoComplete="new-password" className={field} value={password.confirmation} onChange={(e) => setPassword({ ...password, confirmation: e.target.value })} /></label>
              <div className="sm:col-span-2"><button disabled={passwordSaving} className="rounded border border-coral/60 px-5 py-3 font-black text-paper transition hover:bg-coral/10 disabled:opacity-60">{passwordSaving ? "Modification…" : "Changer le mot de passe"}</button></div>
            </form>
          </section>
        </div>
      </div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  );
}
