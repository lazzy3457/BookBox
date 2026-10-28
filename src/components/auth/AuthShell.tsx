import { BookHeart, Quote, Star, UsersRound } from "lucide-react";

const perks = [
  { icon: BookHeart, text: "Suis tes lectures et la page où tu t'es arrêté" },
  { icon: Star, text: "Note, écris tes avis, garde tes passages préférés" },
  { icon: UsersRound, text: "Découvre ce que lisent tes amis" }
];

type AuthShellProps = {
  panelTitle: string;
  children: React.ReactNode;
};

// Carte en deux colonnes des écrans de compte : formulaire à gauche, panneau bordeaux à droite.
export function AuthShell({ panelTitle, children }: AuthShellProps) {
  return (
    <div className="mx-auto mt-4 grid max-w-[1040px] overflow-hidden rounded bg-panel shadow-poster sm:mt-10 md:grid-cols-2">
      <div className="flex flex-col justify-center p-7 sm:p-14">{children}</div>
      <aside className="flex flex-col gap-5 bg-gradient-to-br from-mint to-[#a94b3a] p-8 text-ink sm:p-12">
        <svg viewBox="0 0 44 40" aria-hidden="true" className="h-9 w-10">
          <path d="M2 8C10 3 17 4 22 10C27 4 34 3 42 8L40 17C33 14 27 15 22 19C17 15 11 14 4 17L2 8Z" fill="#f2c9b4" />
          <path d="M36 16H8C6.34315 16 5 17.3431 5 19V35C5 36.6569 6.34315 38 8 38H36C37.6569 38 39 36.6569 39 35V19C39 17.3431 37.6569 16 36 16Z" fill="#f5ede1" />
          <path opacity="0.55" d="M22.75 17H21.25V37H22.75V17Z" fill="#c4693d" />
        </svg>
        <p className="font-display text-[32px] font-semibold leading-tight">{panelTitle}</p>
        <ul className="flex flex-col gap-3.5">
          {perks.map((perk) => (
            <li key={perk.text} className="flex items-center gap-3 text-sm">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink/15"><perk.icon size={16} aria-hidden /></span>
              {perk.text}
            </li>
          ))}
        </ul>
        <figure className="mt-auto flex flex-col gap-2 rounded-xl bg-ink/10 p-5">
          <Quote size={16} aria-hidden className="text-[#f0b48f]" />
          <blockquote className="font-display text-lg italic leading-snug">La vraie vie, la vie enfin découverte et éclaircie, c&apos;est la littérature.</blockquote>
          <figcaption className="text-[11px] font-bold text-ink/75">Marcel Proust · Le Temps retrouvé</figcaption>
        </figure>
      </aside>
    </div>
  );
}

export function AuthField({ label, hint, aside, children }: { label: string; hint?: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-center justify-between gap-3 text-[13px] font-extrabold text-paper">
        {label}
        {aside}
      </span>
      {children}
      {hint ? <span className="text-[11px] text-muted">{hint}</span> : null}
    </label>
  );
}
