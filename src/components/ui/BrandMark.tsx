type BrandMarkProps = {
  className?: string;
};

// Livre ouvert posé sur une boîte : pages en accent principal, boîte en accent secondaire.
export function BrandMark({ className = "h-9 w-9" }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <rect x="7" y="18" width="26" height="16" rx="2.5" className="fill-coral" />
      <rect x="19.25" y="18" width="1.5" height="16" className="fill-mint" opacity="0.45" />
      <path d="M20 19.5C15.5 16.8 10.4 16.4 5.5 18L4 11.6C9.6 9.8 15.6 11 20 15.2Z" className="fill-mint" />
      <path d="M20 19.5C24.5 16.8 29.6 16.4 34.5 18L36 11.6C30.4 9.8 24.4 11 20 15.2Z" className="fill-mint" />
    </svg>
  );
}
