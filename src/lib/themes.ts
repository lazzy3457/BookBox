export const themes = [
  {
    id: "cosy",
    label: "Bibliothèque cosy",
    description: "Bordeaux, terracotta et papier : l’ambiance coin du feu de BooksBox.",
    premium: false
  },
  {
    id: "nuit",
    label: "Nuit",
    description: "L’interface sombre et dense historique, pensée pour lire tard.",
    premium: true
  }
] as const;

export type ThemeId = (typeof themes)[number]["id"];

export const defaultTheme: ThemeId = "cosy";

export const themeIds = themes.map((theme) => theme.id) as [ThemeId, ...ThemeId[]];

export function resolveTheme(value: string | null | undefined): ThemeId {
  return themeIds.includes(value as ThemeId) ? (value as ThemeId) : defaultTheme;
}
