"use client";

import { EntitySearchCombobox } from "@/components/entity-search-combobox";
import { PcSheetCard } from "@/components/tools/pc-main/sheet-card";
import type { CategoryKey } from "@/lib/categories";
import { getClassCastingInfo } from "@/lib/pc-planner/classCasting";
import type { PcPlanState } from "@/lib/pc-planner/types";

type PatchFn = (fn: (draft: PcPlanState) => void) => void;

const DEITY_SEARCH_CATEGORIES: CategoryKey[] = ["deities"];
const DOMAIN_SEARCH_CATEGORIES: CategoryKey[] = ["domains"];

export function PcMainDivineArcane({
  state,
  patch,
}: {
  state: PcPlanState;
  patch: PatchFn;
}) {
  const castingNames = new Set(
    state.identity.classLevels
      .map((cl) => getClassCastingInfo(cl.classSlug, cl.className)?.fgClassName.toLowerCase())
      .filter((name): name is string => Boolean(name)),
  );
  const showDeity = castingNames.has("cleric") || castingNames.has("paladin");
  const showDomains = castingNames.has("cleric");
  const showSpecialist = castingNames.has("wizard");
  if (!showDeity && !showDomains && !showSpecialist) return null;

  return (
    <PcSheetCard title="Divine / Arcane Options" className="pc-main-divine">
      <dl className="npc-sheet-stats pc-sheet-meta">
        {showDeity ? (
          <div>
            <dt>Deity</dt>
            <dd>
              {state.identity.deitySlug ? (
                <div className="pc-sheet-race-value">
                  <span>{state.identity.deity}</span>
                  <button
                    type="button"
                    className="pc-sheet-link-btn"
                    onClick={() =>
                      patch((s) => {
                        s.identity.deity = "";
                        s.identity.deitySlug = null;
                      })
                    }
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <EntitySearchCombobox
                  categories={DEITY_SEARCH_CATEGORIES}
                  placeholder="Search deities…"
                  label="Search deities"
                  onSelect={(hit) =>
                    patch((s) => {
                      s.identity.deity = hit.name;
                      s.identity.deitySlug = hit.slug;
                    })
                  }
                />
              )}
            </dd>
          </div>
        ) : null}
        {showDomains ? (
          <div>
            <dt>Domains</dt>
            <dd>
              <div className="pc-domain-list">
                {(state.identity.domains ?? []).map((domain) => (
                  <span key={domain.slug} className="pc-domain-chip">
                    {domain.name}
                    <button
                      type="button"
                      className="pc-sheet-link-btn"
                      onClick={() =>
                        patch((s) => {
                          s.identity.domains = (s.identity.domains ?? []).filter(
                            (d) => d.slug !== domain.slug,
                          );
                        })
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              {(state.identity.domains?.length ?? 0) < 2 ? (
                <EntitySearchCombobox
                  categories={DOMAIN_SEARCH_CATEGORIES}
                  placeholder="Add domain…"
                  label="Add domain"
                  onSelect={(hit) =>
                    patch((s) => {
                      const current = s.identity.domains ?? [];
                      if (current.some((d) => d.slug === hit.slug) || current.length >= 2) {
                        return;
                      }
                      s.identity.domains = [...current, { slug: hit.slug, name: hit.name }];
                    })
                  }
                />
              ) : null}
            </dd>
          </div>
        ) : null}
        {showSpecialist ? (
          <div>
            <dt>Specialist school</dt>
            <dd>
              <input
                type="text"
                className="pc-sheet-input"
                placeholder="e.g. Evocation"
                value={state.identity.specialistSchool ?? ""}
                onChange={(e) =>
                  patch((s) => {
                    s.identity.specialistSchool = e.target.value.trim() || null;
                  })
                }
              />
            </dd>
          </div>
        ) : null}
      </dl>
    </PcSheetCard>
  );
}
