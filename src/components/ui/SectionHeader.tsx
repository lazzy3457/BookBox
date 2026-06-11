type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function SectionHeader({ eyebrow, title, description, action }: SectionHeaderProps) {
  return (
    <div className="mb-5 flex flex-col gap-4 border-b border-line pb-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-mint">{eyebrow}</div> : null}
        <h1 className="text-2xl font-black tracking-normal text-paper sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
