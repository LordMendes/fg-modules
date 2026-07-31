import { notFound } from "next/navigation";
import { getListWithItems } from "@/actions/lists";
import { ListViewer } from "@/components/list-viewer";

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const list = await getListWithItems(id);
  if (!list) notFound();

  return (
    <div className="profile-page list-viewer-page">
      <ListViewer listId={list.id} listName={list.name} initialItems={list.items} />
    </div>
  );
}
