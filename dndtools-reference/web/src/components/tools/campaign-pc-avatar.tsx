"use client";

/** Circular portrait from token image URL, or initials from a character name. */
export function CampaignPcAvatar({
  name,
  src = null,
  size = "md",
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = initialsFromName(name);
  return (
    <span
      className={`campaign-pc-avatar campaign-pc-avatar--${size}${
        src ? " campaign-pc-avatar--photo" : ""
      }${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="campaign-pc-avatar-img" />
      ) : (
        initials
      )}
    </span>
  );
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}
