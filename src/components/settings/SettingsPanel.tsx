"use client";

import { Bell, EyeOff, Moon, Shield, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const preferenceItems = [
  {
    icon: Moon,
    title: "Theme sombre",
    description: "BooksBox V1 reste pense pour une lecture confortable sur desktop."
  },
  {
    icon: Bell,
    title: "Notifications sociales",
    description: "Preparer les futurs retours de likes, commentaires et nouveaux followers."
  },
  {
    icon: EyeOff,
    title: "Masquer les spoilers",
    description: "Garder les reviews sensibles cachees tant que tu ne les reveles pas."
  }
];

type NotificationPreference = {
  enabled: boolean;
  likesEnabled: boolean;
  commentsEnabled: boolean;
  friendReviewsEnabled: boolean;
};

export function SettingsPanel() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    "Theme sombre": true,
    "Notifications sociales": true,
    "Masquer les spoilers": true
  });
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreference | null>(null);

  useEffect(() => {
    fetch("/api/mobile/notification-preferences")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload?.preferences) {
          setNotificationPreferences(payload.preferences);
          setEnabled((current) => ({ ...current, "Notifications sociales": payload.preferences.enabled }));
        }
      })
      .catch(() => null);
  }, []);

  async function togglePreference(title: string) {
    if (title !== "Notifications sociales") {
      setEnabled((current) => ({ ...current, [title]: !current[title] }));
      return;
    }

    const nextEnabled = !(notificationPreferences?.enabled ?? enabled[title]);
    setEnabled((current) => ({ ...current, [title]: nextEnabled }));
    setNotificationPreferences((current) => (current ? { ...current, enabled: nextEnabled } : current));

    const response = await fetch("/api/mobile/notification-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: nextEnabled })
    });

    if (!response.ok) {
      setEnabled((current) => ({ ...current, [title]: !nextEnabled }));
      setNotificationPreferences((current) => (current ? { ...current, enabled: !nextEnabled } : current));
      return;
    }

    const payload = await response.json();
    setNotificationPreferences(payload.preferences);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        {preferenceItems.map((item) => (
          <div key={item.title} className="flex items-center justify-between gap-5 rounded border border-line bg-panel/80 p-5 shadow-poster">
            <div className="flex items-center gap-4">
              <div className="grid h-11 w-11 place-items-center rounded bg-mint/12 text-mint">
                <item.icon size={20} />
              </div>
              <div>
                <h2 className="text-base font-black text-paper">{item.title}</h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-muted">{item.description}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => togglePreference(item.title)}
              className={`h-7 w-12 rounded-full border p-1 transition ${
                enabled[item.title] ? "border-mint bg-mint" : "border-line bg-ink"
              }`}
              aria-pressed={enabled[item.title]}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white transition ${
                  enabled[item.title] ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        ))}
      </section>

      <aside className="space-y-4">
        <div className="rounded border border-line bg-panel/80 p-5 shadow-poster">
          <div className="grid h-11 w-11 place-items-center rounded bg-sky/12 text-sky">
            <Shield size={20} />
          </div>
          <h2 className="mt-4 text-lg font-black text-paper">Confidentialite</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Les reviews, commentaires et statuts de lecture restent publics dans la V1 sociale. Les reglages fins arriveront
            avec les profils publics.
          </p>
        </div>

        <div className="rounded border border-line bg-panel/80 p-5 shadow-poster">
          <div className="grid h-11 w-11 place-items-center rounded bg-amber/12 text-amber">
            <Sparkles size={20} />
          </div>
          <h2 className="mt-4 text-lg font-black text-paper">Compte</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            La prochaine etape naturelle ici sera l'edition du pseudo, de la bio, de l'avatar et l'export des donnees.
          </p>
        </div>
      </aside>
    </div>
  );
}
