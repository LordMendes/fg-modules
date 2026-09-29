import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { loadAdminOverview } from "@/lib/admin/overview";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/admin");
  }
  if (!isAdminUser(user)) {
    return null;
  }
  const overview = await loadAdminOverview();

  return (
    <div className="admin-page">
      <header className="page-header">
        <h1>Admin</h1>
        <p>
          Signed in as <strong>{user.username}</strong> ({user.email})
        </p>
      </header>

      <ul className="admin-counts">
        <li>Users: {overview.counts.users}</li>
        <li>PCs: {overview.counts.pcPlans}</li>
        <li>Campaigns: {overview.counts.campaigns}</li>
        <li>Saved lists: {overview.counts.savedLists}</li>
      </ul>

      <section className="admin-section">
        <h2>Users</h2>
        <div className="table-wrap">
          <table className="entity-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Email</th>
                <th>Joined (UTC)</th>
                <th>PCs</th>
                <th>Lists</th>
                <th>Campaigns as DM</th>
                <th>Memberships</th>
              </tr>
            </thead>
            <tbody>
              {overview.users.length === 0 ? (
                <tr>
                  <td colSpan={8}>None</td>
                </tr>
              ) : (
                overview.users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.name ?? ""}</td>
                    <td>{u.email}</td>
                    <td>{u.createdAt}</td>
                    <td>{u.pcPlanCount}</td>
                    <td>{u.listCount}</td>
                    <td>{u.campaignsAsDmCount}</td>
                    <td>{u.campaignMembershipCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <h2>PCs</h2>
        <div className="table-wrap">
          <table className="entity-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Owner</th>
                <th>Email</th>
                <th>Created (UTC)</th>
                <th>Updated (UTC)</th>
                <th>Shared</th>
                <th>Campaigns</th>
              </tr>
            </thead>
            <tbody>
              {overview.pcPlans.length === 0 ? (
                <tr>
                  <td colSpan={7}>None</td>
                </tr>
              ) : (
                overview.pcPlans.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.ownerUsername}</td>
                    <td>{p.ownerEmail}</td>
                    <td>{p.createdAt}</td>
                    <td>{p.updatedAt}</td>
                    <td>{p.shared ? "Yes" : "No"}</td>
                    <td>
                      {p.campaignNames.length > 0
                        ? p.campaignNames.join(", ")
                        : "None"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <h2>Campaigns</h2>
        <div className="table-wrap">
          <table className="entity-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>DM</th>
                <th>Email</th>
                <th>Created (UTC)</th>
                <th>Members</th>
                <th>PCs</th>
                <th>Maps</th>
                <th>NPCs</th>
              </tr>
            </thead>
            <tbody>
              {overview.campaigns.length === 0 ? (
                <tr>
                  <td colSpan={8}>None</td>
                </tr>
              ) : (
                overview.campaigns.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.dmUsername}</td>
                    <td>{c.dmEmail}</td>
                    <td>{c.createdAt}</td>
                    <td>{c.memberCount}</td>
                    <td>{c.pcCount}</td>
                    <td>{c.mapCount}</td>
                    <td>{c.npcCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <h2>Saved lists</h2>
        <div className="table-wrap">
          <table className="entity-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Owner</th>
                <th>Email</th>
                <th>Created (UTC)</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              {overview.savedLists.length === 0 ? (
                <tr>
                  <td colSpan={5}>None</td>
                </tr>
              ) : (
                overview.savedLists.map((l) => (
                  <tr key={l.id}>
                    <td>{l.name}</td>
                    <td>{l.ownerUsername}</td>
                    <td>{l.ownerEmail}</td>
                    <td>{l.createdAt}</td>
                    <td>{l.itemCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
