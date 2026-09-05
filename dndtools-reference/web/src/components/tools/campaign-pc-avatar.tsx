"use client";

/** Circular placeholder portrait from a character name. */
export function CampaignPcAvatar({
  name,
  size = "md",
  className = "",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = initialsFromName(name);
  return (
    <span
      className={`campaign-pc-avatar campaign-pc-avatar--${size}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}
