import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Profile",
  description: "Manage your saved lists and character plans.",
  path: "/profile",
  noindex: true,
});

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/profile");
  }

  return children;
}
