"use client";

import { ShieldOff, UserRoundX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Toast } from "@/components/ui/Toast";

type BlockedUser = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  blockedAt: string;
};

export function BlockedUsers() {
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/blocks", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Impossible de charger les comptes bloqués.");
        return response.json() as Promise<{ users: BlockedUser[] }>;
      })
      .then((payload) => {
        if (active) setUsers(payload.users);
      })
      .catch((error) => {
        if (active) setToast({ tone: "error", message: error instanceof Error ? error.message : "Chargement impossible." });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function unblock(user: BlockedUser) {
    setBusyId(user.id);
    try {
      const response = await fetch(`/api/blocks?userId=${encodeURIComponent(user.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Le déblocage a échoué.");
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setToast({ tone: "success", message: `${user.name ?? user.username ?? "Ce compte"} a été débloqué.` });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Le déblocage a échoué." });
    } finally {
      setBusyId(null);
    }
  }

  const closeToast = useCallback(() => setToast(null), []);

  return (
    <>
      <section className="mt-7 rounded border border-line bg-panel/80 p-5 shadow-poster">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded border border-line bg-ink text-mint">
            <ShieldOff size={18} />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-mint">Confidentialité</div>
            <h2 className="mt-1 text-xl font-black text-paper">Comptes bloqués</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Vous ne voyez plus vos profils, contenus ou activités respectifs, et aucune interaction n’est possible.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="mt-5 text-sm text-muted">Chargement…</p>
        ) : users.length === 0 ? (
          <div className="mt-5 flex items-center gap-3 rounded border border-line bg-ink/45 p-4 text-sm text-muted">
            <UserRoundX size={17} />
            Aucun compte bloqué.
          </div>
        ) : (
          <div className="mt-5 divide-y divide-line rounded border border-line">
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-ink font-black text-mint">
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (user.name ?? user.username ?? "B").slice(0, 1).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-black text-paper">{user.name ?? "Lecteur BooksBox"}</div>
                  {user.username ? <div className="truncate text-xs text-muted">@{user.username}</div> : null}
                </div>
                <button
                  type="button"
                  disabled={busyId === user.id}
                  onClick={() => unblock(user)}
                  className="rounded border border-line px-3 py-2 text-xs font-black text-paper transition hover:border-mint hover:text-mint disabled:opacity-50"
                >
                  {busyId === user.id ? "Déblocage…" : "Débloquer"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      {toast ? <Toast {...toast} onClose={closeToast} /> : null}
    </>
  );
}
