"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { login } from "@/actions/auth";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/profile";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await login({ identifier, password, next });
      if (!result.success) {
        setError(result.error ?? "Login failed");
        return;
      }
      // Hard navigation: the new session cookie and user load fresh on the next page.
      window.location.assign(result.redirectTo ?? "/profile");
    });
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error && <p className="auth-form-error">{error}</p>}
      <label className="auth-field">
        <span>Email or username</span>
        <input
          type="text"
          name="identifier"
          autoComplete="username"
          required
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
        />
      </label>
      <label className="auth-field">
        <span>Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="auth-form-footer">
        No account yet? <Link href="/register">Create one</Link>
      </p>
    </form>
  );
}
