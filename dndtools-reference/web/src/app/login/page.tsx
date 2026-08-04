import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Sign in",
  description: "Sign in to access your saved lists and profile.",
  path: "/login",
  noindex: true,
});

export default function LoginPage() {
  return (
    <div className="auth-page">
      <header className="page-header">
        <h1>Sign in</h1>
        <p>Access your saved lists and profile.</p>
      </header>
      <Suspense fallback={<p className="auth-form-status">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
