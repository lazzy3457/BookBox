type BrandMarkProps = {
  className?: string;
};

// Livre ouvert posé sur une boîte (glyphe « Book glyph » du Figma) : pages en accent principal, boîte en accent secondaire.
export function BrandMark({ className = "h-10 w-11" }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 44 40" aria-hidden="true" className={className}>
      <path d="M2 8C10 3 17 4 22 10C27 4 34 3 42 8L40 17C33 14 27 15 22 19C17 15 11 14 4 17L2 8Z" className="fill-mint" />
      <path d="M36 16H8C6.34315 16 5 17.3431 5 19V35C5 36.6569 6.34315 38 8 38H36C37.6569 38 39 36.6569 39 35V19C39 17.3431 37.6569 16 36 16Z" className="fill-coral" />
      <path opacity="0.55" d="M22.75 17H21.25V37H22.75V17Z" className="fill-ink" />
    </svg>
  );
}
