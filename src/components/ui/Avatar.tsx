import { initials } from "@/lib/format";

type AvatarProps = {
  name?: string | null;
  image?: string | null;
  size?: number;
  className?: string;
};

export function Avatar({ name, image, size = 40, className = "" }: AvatarProps) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-mint font-extrabold text-ink ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size / 3)) }}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(name, "?").slice(0, size < 36 ? 1 : 2)
      )}
    </span>
  );
}
