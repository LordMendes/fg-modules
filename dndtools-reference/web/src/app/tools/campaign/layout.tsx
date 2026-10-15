import { redirect } from "next/navigation";
import { ServerUserProvider } from "@/components/bootstrap-provider";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Campaign tables need the signed-in user on the first render, so the user is
 * resolved here on the server. The proxy only checks that the auth cookie
 * exists. This checks the session row in the database.
 */
export default async function CampaignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/tools/campaign");
  }

  return <ServerUserProvider user={user}>{children}</ServerUserProvider>;
}
