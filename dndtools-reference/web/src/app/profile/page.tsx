import { getUserLists } from "@/actions/lists";
import { ProfileListsManager } from "@/components/profile-lists-manager";
import { getCurrentUser } from "@/lib/auth/session";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const lists = await getUserLists();

  return (
    <div className="profile-page">
      <header className="page-header">
        <h1>Profile</h1>
        <p>
          Signed in as <strong>{user?.username}</strong> ({user?.email})
        </p>
      </header>
      <ProfileListsManager initialLists={lists} />
    </div>
  );
}
