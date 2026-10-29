"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { timeAgo } from "@/lib/format";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  targetUrl: string | null;
  readAt: string | null;
  createdAt: string;
  actor: { name: string | null; image: string | null } | null;
};

const REFRESH_MS = 60_000;

// Boîte de notifications du site (réponses, mentions, invitations, likes…).
export function NotificationBell() {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/mobile/notifications").catch(() => null);
    if (!response?.ok) return;
    const payload = await response.json();
    setItems(payload.notifications ?? []);
    setUnread(payload.unreadCount ?? 0);
    setLoaded(true);
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function markAllRead() {
    const response = await fetch("/api/notifications/read-all", { method: "POST" });
    if (!response.ok) return;
    setUnread(0);
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
  }

  async function markRead(item: NotificationItem) {
    setOpen(false);
    if (item.readAt) return;
    setUnread((value) => Math.max(0, value - 1));
    setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry)));
    await fetch(`/api/mobile/notifications/${item.id}/read`, { method: "PATCH" }).catch(() => null);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} non lues` : "Notifications"}
        className="relative grid h-10 w-10 place-items-center rounded-full border border-line bg-panel text-paper transition hover:text-mint"
      >
        <Bell size={17} aria-hidden />
        {unread ? (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-coral px-1 text-[10px] font-extrabold text-white">{unread > 9 ? "9+" : unread}</span>
        ) : null}
      </button>
      {open ? (
        <div role="dialog" aria-label="Notifications" className="bb-card fixed inset-x-3 top-16 z-50 flex flex-col overflow-hidden sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-[360px]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="bb-h3 text-base">Notifications</p>
            {unread ? <button type="button" onClick={() => void markAllRead()} className="text-xs font-extrabold text-mint hover:underline">Tout marquer comme lu</button> : null}
          </div>
          <div className="max-h-[min(420px,65vh)] overflow-y-auto">
            {items.length ? (
              items.map((item) => {
                const content = (
                  <>
                    <Avatar name={item.actor?.name ?? "B"} image={item.actor?.image ?? null} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[13px] ${item.readAt ? "font-bold text-paper" : "font-extrabold text-paper"}`}>{item.title}</span>
                      <span className="block truncate text-xs text-muted">{item.message}</span>
                      <span className="block text-[11px] text-muted">{timeAgo(item.createdAt)}</span>
                    </span>
                    {!item.readAt ? <span aria-label="Non lue" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-coral" /> : null}
                  </>
                );
                const className = `flex gap-3 border-b border-line/70 px-4 py-3 text-left transition last:border-0 hover:bg-ink ${item.readAt ? "" : "bg-mint/[0.04]"}`;
                return item.targetUrl ? (
                  <Link key={item.id} href={item.targetUrl} onClick={() => void markRead(item)} className={className}>{content}</Link>
                ) : (
                  <button key={item.id} type="button" onClick={() => void markRead(item)} className={`${className} w-full`}>{content}</button>
                );
              })
            ) : (
              <p className="px-4 py-6 text-center text-sm text-muted">{loaded ? "Aucune notification pour l'instant." : "Chargement…"}</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
