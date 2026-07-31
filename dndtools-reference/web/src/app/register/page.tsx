import { RegisterForm } from "@/components/register-form";

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
