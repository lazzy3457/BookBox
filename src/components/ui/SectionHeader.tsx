type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  as?: "h1" | "h2";
};

export function SectionHeader({ eyebrow, title, description, action, as: Heading = "h1" }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0">
        {eyebrow ? <div className="bb-eyebrow mb-2">{eyebrow}</div> : null}
        <Heading className="bb-h1">{title}</Heading>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
