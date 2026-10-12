import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { AppShell } from "@/components/layout/AppShell";
import { isAdminRole } from "@/server/auth/admin";
import { getSiteUrl, siteConfig } from "@/lib/site";
import { prisma } from "@/server/db/prisma";
import { UserPreferencesProvider } from "@/components/settings/UserPreferencesProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    url: "/"
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description
  },
  robots: {
    index: true,
    follow: true
  }
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  const preference = session?.user?.id
    ? await prisma.userPreference.findUnique({ where: { userId: session.user.id }, select: { hideSpoilers: true } })
    : null;

  return (
    <html lang="fr">
      <body className={inter.className}>
        <UserPreferencesProvider hideSpoilers={preference?.hideSpoilers ?? true}>
          <AppShell user={session?.user} isAdmin={isAdminRole(session?.user?.role)}>{children}</AppShell>
        </UserPreferencesProvider>
      </body>
    </html>
  );
}
