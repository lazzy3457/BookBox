type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function SectionHeader({ eyebrow, title, description, action }: SectionHeaderProps) {
  return (
    <div className="mb-5 flex items-end justify-between gap-6 border-b border-line pb-3">
      <div>
        {eyebrow ? <div className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-mint">{eyebrow}</div> : null}
        <h1 className="text-3xl font-black tracking-normal text-paper">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
