import { SectionHeader } from "@/components/ui/SectionHeader";
import { SearchWorkspace } from "@/components/search/SearchWorkspace";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { getRecommendations } from "@/server/services/recommendations";
import { RecommendationShelf } from "@/components/books/RecommendationShelf";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const session = await getServerSession(authOptions);
  const recommendations = session?.user?.id ? await getRecommendations(session.user.id, 6) : [];
  return (
    <div className="min-w-0 overflow-hidden">
      <SectionHeader
        eyebrow="Catalogue"
        title="Recherche et ajout de livres"
        description="Cherche dans Google Books et Open Library, compare les editions, puis ajoute le bon livre a ta bibliotheque."
      />
      {session?.user?.id ? (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-black text-paper">À découvrir pour toi</h2>
          <RecommendationShelf initialItems={recommendations} />
        </section>
      ) : null}
      <SearchWorkspace />
    </div>
  );
}
