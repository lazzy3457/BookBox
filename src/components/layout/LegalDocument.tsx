import { legalConfig } from "@/lib/legal";

type LegalDocumentProps = {
  eyebrow: string;
  title: string;
  introduction: string;
  children: React.ReactNode;
};

export function LegalDocument({ eyebrow, title, introduction, children }: LegalDocumentProps) {
  return (
    <article className="mx-auto max-w-4xl">
      <header className="rounded border border-line bg-gradient-to-br from-slateCard via-panel to-ink p-6 shadow-poster sm:p-9">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-mint">{eyebrow}</div>
        <h1 className="mt-2 text-3xl font-black text-paper sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-3xl leading-7 text-muted">{introduction}</p>
        <p className="mt-4 text-xs text-muted/70">Dernière mise à jour : {legalConfig.updatedAtLabel}</p>
      </header>
      <div className="mt-6 space-y-8 rounded border border-line bg-panel/75 p-6 text-sm leading-7 text-muted shadow-poster sm:p-9 [&_a]:font-bold [&_a]:text-mint [&_a]:underline-offset-4 hover:[&_a]:underline [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-paper [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-2 [&_ul]:mt-3">
        {children}
      </div>
    </article>
  );
}
