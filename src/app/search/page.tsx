import { SectionHeader } from "@/components/ui/SectionHeader";
import { SearchWorkspace } from "@/components/search/SearchWorkspace";

export default function SearchPage() {
  return (
    <div>
      <SectionHeader
        eyebrow="Catalogue"
        title="Recherche et ajout de livres"
        description="Cherche dans Google Books et Open Library, compare les editions, puis ajoute le bon livre a ta bibliotheque."
      />
      <SearchWorkspace />
    </div>
  );
}
