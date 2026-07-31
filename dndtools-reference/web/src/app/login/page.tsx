import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

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
