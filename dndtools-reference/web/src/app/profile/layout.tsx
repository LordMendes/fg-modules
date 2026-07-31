import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

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
