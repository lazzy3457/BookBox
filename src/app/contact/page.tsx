import type { Metadata } from "next";
import Link from "next/link";
import { Mail, ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contacter l’équipe BooksBox.",
  alternates: { canonical: "/contact" }
};

export default function ContactPage() {
  const contactEmail = process.env.CONTACT_EMAIL?.trim();

  return (
    <div className="mx-auto max-w-3xl">
      <section className="rounded border border-line bg-gradient-to-br from-slateCard via-panel to-ink p-6 shadow-poster sm:p-9">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-mint">Une question ?</div>
        <h1 className="mt-2 text-3xl font-black text-paper sm:text-4xl">Contacter BooksBox</h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted">
          Un problème de compte, une question sur tes données ou un contenu à signaler : utilise le canal adapté.
        </p>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className="rounded border border-line bg-panel/80 p-6 shadow-poster">
          <Mail className="text-mint" size={22} />
          <h2 className="mt-4 text-xl font-black text-paper">Aide et données personnelles</h2>
          {contactEmail ? (
            <a href={`mailto:${contactEmail}`} className="mt-4 inline-block font-black text-mint hover:underline">
              {contactEmail}
            </a>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted">
              L’adresse de contact sera affichée ici dès qu’elle sera renseignée pour la mise en ligne.
            </p>
          )}
        </section>

        <section className="rounded border border-line bg-panel/80 p-6 shadow-poster">
          <ShieldAlert className="text-coral" size={22} />
          <h2 className="mt-4 text-xl font-black text-paper">Signaler un contenu</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Utilise le bouton « Signaler » présent sur les profils, reviews et commentaires concernés.
          </p>
          <Link href="/commu" className="mt-4 inline-block text-sm font-black text-mint hover:underline">
            Accéder à la communauté
          </Link>
          <Link href="/signalement" className="mt-3 block text-sm font-black text-mint hover:underline">Notifier un contenu potentiellement illicite</Link>
        </section>
      </div>
    </div>
  );
}
