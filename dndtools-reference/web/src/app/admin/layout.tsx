import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Admin",
  description: "Site administration.",
  path: "/admin",
  noindex: true,
});

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/admin");
  }

  if (!isAdminUser(user)) {
    return (
      <div className="admin-page">
        <header className="page-header">
          <h1>Admin</h1>
          <p>You do not have access to this page.</p>
        </header>
      </div>
    );
  }

  return children;
}
