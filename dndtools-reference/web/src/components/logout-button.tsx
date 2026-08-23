"use client";

import { useTransition } from "react";
import { logout } from "@/actions/auth";

type LogoutButtonProps = {
  className?: string;
  onLoggedOut?: () => void;
};

export function LogoutButton({
  className = "btn-ghost",
  onLoggedOut,
}: LogoutButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await logout();
          onLoggedOut?.();
        })
      }
    >
      {pending ? "Signing out…" : "Log out"}
    </button>
  );
}
