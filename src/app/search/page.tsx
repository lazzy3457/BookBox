import { getSession } from "@/server/auth/session";
import type { Metadata } from "next";
import { SearchWorkspace } from "@/components/search/SearchWorkspace";
import { genreLabel } from "@/lib/genres";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recherche"
};

type SearchPageProps = {
  searchParams: Promise<{ q?: string; genre?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  const initialQuery = params.q ?? (params.genre ? `subject:${genreLabel(params.genre)}` : "");

  return <SearchWorkspace initialQuery={initialQuery} isSignedIn={Boolean(session?.user?.id)} />;
}
