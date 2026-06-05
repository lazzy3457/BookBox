import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { redirect } from "next/navigation";
import { ListPlus } from "lucide-react";
import { NewListForm } from "@/components/lists/NewListForm";

export default async function NewListPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl">
      <section className="relative mb-8 overflow-hidden rounded border border-line bg-gradient-to-br from-slateCard via-panel to-ink p-7 shadow-poster">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-mint via-sky to-coral" />
        <div className="flex items-center gap-3">
          <ListPlus size={22} className="text-mint" />
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-mint">Collections</div>
            <h1 className="mt-1 text-3xl font-black text-paper">Nouvelle liste</h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">
          Crée une liste pour regrouper une saga, une thématique, ou n'importe quelle sélection de livres.
        </p>
      </section>

      <NewListForm />
    </div>
  );
}