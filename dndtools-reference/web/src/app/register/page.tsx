import { RegisterForm } from "@/components/register-form";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Create account",
  description: "Create an account to save spells, feats, and other entries to custom lists.",
  path: "/register",
  noindex: true,
});

export default function RegisterPage() {
  return (
    <div className="auth-page">
      <header className="page-header">
        <h1>Create account</h1>
        <p>Save spells, feats, and other entries to custom lists.</p>
      </header>
      <RegisterForm />
    </div>
  );
}
