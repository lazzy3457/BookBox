export const siteConfig = {
  name: "BooksBox",
  description: "Suis tes lectures, tiens ton journal et partage tes découvertes avec une communauté de lecteurs."
};

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL;
  try {
    return new URL(configuredUrl ?? "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}
