import { notFound } from "next/navigation";
import Link from "next/link";
import { isCategoryKey, getCategoryLabel } from "@/lib/categories";
import { getEntityDetail } from "@/lib/entities";
import { EntityDetailView } from "@/components/entity-detail";
import type { CategoryKey } from "@/lib/categories";

type Props = {
  params: Promise<{ category: string; slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { category, slug } = await params;
  if (!isCategoryKey(category)) return {};
  const entity = await getEntityDetail(category as CategoryKey, slug);
  if (!entity) return {};
  return {
    title: entity.name,
    description: entity.descriptionText?.slice(0, 160) ?? undefined,
  };
}

export default async function EntityDetailPage({ params }: Props) {
  const { category, slug } = await params;
  if (!isCategoryKey(category)) notFound();

  const entity = await getEntityDetail(category as CategoryKey, slug);
  if (!entity) notFound();

  return (
    <>
      <nav className="breadcrumb">
        <Link href="/">Home</Link> /{" "}
        <Link href={`/${category}`}>{getCategoryLabel(category)}</Link> /{" "}
        {entity.name}
      </nav>
      <EntityDetailView category={category} entity={entity} />
    </>
  );
}
