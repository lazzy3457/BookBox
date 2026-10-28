// Petits formats d'affichage partagés par les pages de la refonte.

export function timeAgo(date: Date | string, now = new Date()) {
  const value = typeof date === "string" ? new Date(date) : date;
  const minutes = Math.round((now.getTime() - value.getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} j`;
  return value.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function daysSince(date: Date | string, now = new Date()) {
  const value = typeof date === "string" ? new Date(date) : date;
  return Math.max(0, Math.floor((now.getTime() - value.getTime()) / 86400000));
}

export function initials(name: string | null | undefined, fallback = "BB") {
  return (
    (name ?? "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || fallback
  );
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

export function greeting(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hour12: false, timeZone: "Europe/Paris" }).format(date));
  return hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour";
}

export function daysAgo(days: number) {
  return new Date(Date.now() - days * 86400000);
}
