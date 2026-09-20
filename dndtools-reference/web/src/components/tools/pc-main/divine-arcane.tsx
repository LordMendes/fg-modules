"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { paginateEntities } from "@/actions/data";
import { EntitySearchCombobox } from "@/components/entity-search-combobox";
import { MultiSelect, type MultiSelectOption } from "@/components/multi-select";
import { useSessionNonce } from "@/components/session-provider";
import { PcSheetCard } from "@/components/tools/pc-main/sheet-card";
import type { CategoryKey } from "@/lib/categories";
import { getClassCastingInfo } from "@/lib/pc-planner/classCasting";
import { ARCANE_SCHOOLS } from "@/lib/spell-utils";
import type { PcPlanState } from "@/lib/pc-planner/types";

type PatchFn = (fn: (draft: PcPlanState) => void) => void;

const DEITY_SEARCH_CATEGORIES: CategoryKey[] = ["deities"];
const MAX_DOMAINS = 2;
const MAX_SPECIALIST_SCHOOLS = 1;

function specialistSchoolOptions(current?: string | null): MultiSelectOption[] {
  const options: MultiSelectOption[] = ARCANE_SCHOOLS.filter((school) => school !== "Universal").map(
    (school) => ({
      value: school,
      label: school,
    }),
  );
  if (current && !options.some((option) => option.value === current)) {
    options.push({ value: current, label: current });
  }
  return options;
}

function schoolOptions(exclude?: string | null): MultiSelectOption[] {
  return ARCANE_SCHOOLS.filter(
    (school) => school !== "Universal" && school !== exclude,
  ).map((school) => ({ value: school, label: school }));
}

function useDomainOptions(enabled: boolean): MultiSelectOption[] {
  const nonce = useSessionNonce();
  const router = useRouter();
  const [options, setOptions] = useState<MultiSelectOption[]>([]);
  const [, startTransition] = useTransition();

  const loadDomains = useCallback(() => {
    if (!enabled) return;
    startTransition(async () => {
      const collected: MultiSelectOption[] = [];
      let cursor: string | undefined;
      do {
        const result = await paginateEntities({
          category: "domains",
          nonce,
          cursor,
          sort: { column: "name", direction: "asc" },
        });
        if (!result.success) {
          if (result.error === "Invalid session") router.refresh();
          break;
        }
        for (const item of result.items ?? []) {
          collected.push({ value: item.slug, label: item.name });
        }
        cursor = result.nextCursor ?? undefined;
      } while (cursor);
      setOptions(collected);
    });
  }, [enabled, nonce, router]);

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  return options;
}

export function PcMainDivineArcane({
  state,
  patch,
  readOnly = false,
  section = "both",
}: {
  state: PcPlanState;
  patch: PatchFn;
  readOnly?: boolean;
  section?: "divine" | "arcane" | "both";
}) {
  const castingNames = new Set(
    state.identity.classLevels
      .map((cl) => getClassCastingInfo(cl.classSlug, cl.className)?.fgClassName.toLowerCase())
      .filter((name): name is string => Boolean(name)),
  );
  const showDeity = castingNames.has("cleric") || castingNames.has("paladin");
  const showDomains = castingNames.has("cleric");
  const showSpecialist = castingNames.has("wizard");
  const domainCatalog = useDomainOptions(showDomains);

  const domainOptions = useMemo(() => {
    const bySlug = new Map(domainCatalog.map((opt) => [opt.value, opt]));
    for (const domain of state.identity.domains ?? []) {
      if (!bySlug.has(domain.slug)) {
        bySlug.set(domain.slug, { value: domain.slug, label: domain.name });
      }
    }
    return [...bySlug.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [domainCatalog, state.identity.domains]);

  const domainSlugs = (state.identity.domains ?? []).map((domain) => domain.slug);
  const opposedSchools = state.identity.opposedSchools ?? [];
  const specialistSchool = state.identity.specialistSchool ?? "";

  const showDivine = (showDeity || showDomains) && section !== "arcane";
  const showArcane = showSpecialist && section !== "divine";

  if (!showDivine && !showArcane) return null;

  function setDomains(slugs: string[]) {
    patch((s) => {
      const limited = slugs.slice(0, MAX_DOMAINS);
      s.identity.domains = limited.map((slug) => {
        const existing = (s.identity.domains ?? []).find((domain) => domain.slug === slug);
        if (existing) return existing;
        const option = domainOptions.find((opt) => opt.value === slug);
        return { slug, name: option?.label ?? slug };
      });
    });
  }

  function setSpecialistSchool(next: string[]) {
    patch((s) => {
      const school = next[next.length - 1] ?? null;
      s.identity.specialistSchool = school;
      if (school) {
        s.identity.opposedSchools = (s.identity.opposedSchools ?? []).filter(
          (opposed) => opposed !== school,
        );
      }
    });
  }

  function setOpposedSchools(next: string[]) {
    patch((s) => {
      const specialist = s.identity.specialistSchool;
      s.identity.opposedSchools = next.filter((school) => school !== specialist);
    });
  }

  const divineCard = showDivine ? (
        <PcSheetCard title="Divine" className="pc-main-divine">
          <dl className="pc-main-meta pc-main-casting-fields">
            {showDeity ? (
              <div>
                <dt>Deity</dt>
                <dd>
                  {readOnly ? (
                    <span>{state.identity.deity || "None"}</span>
                  ) : state.identity.deitySlug ? (
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
                      className="pc-meta-search"
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
                  {readOnly ? (
                    <span>
                      {(state.identity.domains ?? []).map((d) => d.name).join(", ") || "None"}
                    </span>
                  ) : (
                    <MultiSelect
                      label="Domains"
                      showLabel={false}
                      displayMode="badges"
                      maxSelections={MAX_DOMAINS}
                      options={domainOptions}
                      value={domainSlugs}
                      onChange={setDomains}
                      placeholder="Select domains"
                    />
                  )}
                </dd>
              </div>
            ) : null}
          </dl>
        </PcSheetCard>
  ) : null;

  const arcaneCard = showArcane ? (
        <PcSheetCard title="Arcane" className="pc-main-arcane">
          <dl className="pc-main-meta pc-main-casting-fields">
            <div>
              <dt>Specialist school</dt>
              <dd>
                {readOnly ? (
                  <span>{specialistSchool || "None"}</span>
                ) : (
                  <MultiSelect
                    label="Specialist school"
                    showLabel={false}
                    displayMode="badges"
                    maxSelections={MAX_SPECIALIST_SCHOOLS}
                    options={specialistSchoolOptions(specialistSchool)}
                    value={specialistSchool ? [specialistSchool] : []}
                    onChange={setSpecialistSchool}
                    placeholder="Select specialist school"
                  />
                )}
              </dd>
            </div>
            <div>
              <dt>Opposed schools</dt>
              <dd>
                {readOnly ? (
                  <span>{opposedSchools.join(", ") || "None"}</span>
                ) : (
                  <MultiSelect
                    label="Opposed schools"
                    showLabel={false}
                    displayMode="badges"
                    options={schoolOptions(specialistSchool)}
                    value={opposedSchools}
                    onChange={setOpposedSchools}
                    placeholder="Select opposed schools"
                  />
                )}
              </dd>
            </div>
          </dl>
        </PcSheetCard>
  ) : null;

  if (section === "both") {
    return (
      <div className="pc-main-casting-options">
        {divineCard}
        {arcaneCard}
      </div>
    );
  }

  return divineCard ?? arcaneCard;
}
