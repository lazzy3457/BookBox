import type { MetadataRoute } from "next";
import { prisma } from "@/server/db/prisma";
import { slugifyAuthor } from "@/lib/authors";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const books = await prisma.book.findMany({
    select: { id: true, authors: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 5000
  });
  const staticPages = [
    { path: "", priority: 1 },
    { path: "/search", priority: 0.8 },
    { path: "/trending", priority: 0.8 },
    { path: "/commu", priority: 0.7 },
    { path: "/mentions-legales", priority: 0.3 },
    { path: "/confidentialite", priority: 0.3 },
    { path: "/conditions-utilisation", priority: 0.3 },
    { path: "/contact", priority: 0.4 }
    ,
    { path: "/cookies", priority: 0.3 },
    { path: "/signalement", priority: 0.4 }
  ];
  const authorSlugs = new Set(books.flatMap((book) => book.authors.map(slugifyAuthor)).filter(Boolean));

  return [
    ...staticPages.map(({ path, priority }) => ({
      url: new URL(path || "/", baseUrl).toString(),
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority
    })),
    ...books.map((book) => ({
      url: new URL(`/books/${book.id}`, baseUrl).toString(),
      lastModified: book.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7
    })),
    ...Array.from(authorSlugs).map((slug) => ({
      url: new URL(`/authors/${slug}`, baseUrl).toString(),
      changeFrequency: "weekly" as const,
      priority: 0.6
    }))
  ];
}
