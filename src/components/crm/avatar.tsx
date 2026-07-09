import { cn } from "@/lib/utils";

const PALETTE = [
  "#D81E34",
  "#17130F",
  "#1F8A5B",
  "#C8791A",
  "#5b3fb0",
  "#2a6fb0",
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function MemberAvatar({
  firstName,
  lastName,
  size = 34,
  className,
}: {
  firstName: string;
  lastName: string;
  size?: number;
  className?: string;
}) {
  const color = PALETTE[hashCode(`${lastName}${firstName}`) % PALETTE.length];
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  return (
    <span
      className={cn(
        "flex flex-none items-center justify-center font-display font-bold text-white",
        className
      )}
      style={{
        width: size,
        height: size,
        borderRadius: size > 44 ? 16 : 999,
        background: color,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {initials}
    </span>
  );
}
