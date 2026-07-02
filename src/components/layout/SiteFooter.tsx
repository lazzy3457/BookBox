import Link from "next/link";
import { BookOpen } from "lucide-react";

const footerLinks = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/conditions-utilisation", label: "Conditions d’utilisation" },
  { href: "/contact", label: "Contact" }
  ,
  { href: "/signalement", label: "Signaler un contenu" },
  { href: "/cookies", label: "Cookies" }
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line/80 bg-ink/65">
      <div className="mx-auto grid max-w-[1520px] gap-7 px-3 py-8 sm:px-5 md:grid-cols-[1fr_auto] md:items-end xl:px-10">
        <div className="max-w-xl">
          <Link href="/" className="inline-flex items-center gap-2 font-black text-paper">
            <span className="grid h-8 w-8 place-items-center rounded bg-mint text-ink">
              <BookOpen size={16} />
            </span>
            BooksBox
          </Link>
          <p className="mt-3 text-sm leading-6 text-muted">
            Ton journal de lecture, tes recommandations et une communauté pour faire circuler les bonnes histoires.
          </p>
          <p className="mt-4 text-xs text-muted/70">© {new Date().getFullYear()} BooksBox. Tous droits réservés.</p>
        </div>

        <nav aria-label="Informations légales" className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold text-muted">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-mint">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
