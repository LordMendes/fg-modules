import { getUserLists } from "@/actions/lists";
import { getUserPcPlans } from "@/actions/pc-plans";
import { ProfileListsManager } from "@/components/profile-lists-manager";
import { ProfilePcPlansManager } from "@/components/profile-pc-plans-manager";
import { getCurrentUser } from "@/lib/auth/session";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const lists = await getUserLists();
  const pcPlans = await getUserPcPlans();

  return (
    <div className="profile-page">
      <header className="page-header">
        <h1>Profile</h1>
        <p>
          Signed in as <strong>{user?.username}</strong> ({user?.email})
        </p>
      </header>
      <ProfilePcPlansManager initialPlans={pcPlans} />
      <ProfileListsManager initialLists={lists} />
    </div>
  );
}
