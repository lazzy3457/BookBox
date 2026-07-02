import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-2xl rounded border border-line bg-panel/80 p-8 text-center shadow-poster sm:p-12">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded border border-line bg-ink text-mint">
        <BookOpen size={24} />
      </div>
      <div className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-mint">Page introuvable</div>
      <h1 className="mt-2 text-3xl font-black text-paper">Cette page a quitté les rayonnages.</h1>
      <p className="mt-3 text-muted">Le lien est peut-être ancien, privé ou n’existe plus.</p>
      <Link href="/" className="mt-7 inline-flex rounded bg-mint px-5 py-3 text-sm font-black text-ink">
        Revenir à l’accueil
      </Link>
    </section>
  );
}
