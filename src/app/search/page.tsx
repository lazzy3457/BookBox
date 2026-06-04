import { SectionHeader } from "@/components/ui/SectionHeader";
import { SearchWorkspace } from "@/components/search/SearchWorkspace";

export default function SearchPage() {
  return (
    <div>
      <SectionHeader
        eyebrow="Catalogue"
        title="Recherche et ajout de livres"
        description="Cherche dans Google Books côté serveur, puis ajoute un résultat au catalogue ou crée un livre manuel."
      />
      <SearchWorkspace />
    </div>
  );
}
