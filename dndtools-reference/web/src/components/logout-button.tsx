"use client";

import { useTransition } from "react";
import { logout } from "@/actions/auth";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="header-auth-link"
      disabled={pending}
      onClick={() => startTransition(() => logout())}
    >
      {pending ? "Signing out…" : "Log out"}
    </button>
  );
}
