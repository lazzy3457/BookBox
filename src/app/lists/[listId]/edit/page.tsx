import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { EditListForm } from "@/components/lists/EditListForm";

export const dynamic = "force-dynamic";

export default async function EditListPage({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) redirect("/login");

  const list = await prisma.bookList.findUnique({
    where: { id: listId },
    include: {
      entries: {
        orderBy: { order: "asc" },
        include: { book: true },
      },
    },
  });

  if (!list) notFound();
  if (list.userId !== session.user.id) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <section className="relative mb-8 overflow-hidden rounded border border-line bg-gradient-to-br from-slateCard via-panel to-ink p-7 shadow-poster">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-mint via-sky to-coral" />
        <div className="text-xs font-black uppercase tracking-[0.2em] text-mint">Collections</div>
        <h1 className="mt-1 text-3xl font-black text-paper">Modifier la liste</h1>
        <p className="mt-2 text-sm text-muted">Modifie les infos ou retire des livres de ta liste.</p>
      </section>

      <EditListForm list={list} />
    </div>
  );
}