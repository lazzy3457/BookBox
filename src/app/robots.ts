import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl().toString();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/books/", "/authors/", "/search", "/trending", "/commu"],
      disallow: ["/api/", "/settings", "/library", "/diary", "/moderation", "/profile"]
    },
    sitemap: new URL("/sitemap.xml", baseUrl).toString(),
    host: baseUrl
  };
}
