"use client";

import type { SpellPreview } from "@/lib/entities";
import { EntityPreviewModal } from "@/components/entity-preview-modal";

export function SpellPreviewModal({
  spell,
  loading,
  error,
  onClose,
}: {
  spell: SpellPreview | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const entity = spell
    ? {
        category: "spells" as const,
        slug: spell.slug,
        name: spell.name,
        source: spell.source,
        fields: spell.fields,
        descriptionHtml: spell.descriptionHtml,
        descriptionText: spell.descriptionText,
        statLine: null,
      }
    : null;

  return (
    <EntityPreviewModal
      entity={entity}
      loading={loading}
      error={error}
      onClose={onClose}
    />
  );
}
