"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link2, Sparkles } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FieldTooltip, LabelWithTooltip } from "@/components/field-tooltip";
import { MultiSelect, type MultiSelectOption } from "@/components/multi-select";
import { RandomSpellbookSummary } from "@/components/tools/random-spellbook-summary";
import { useSessionNonce } from "@/components/session-provider";
import { fetchWizardSpellPool } from "@/actions/data";
import {
  buildRandomSpellbookSearchParams,
  generateSpellbook,
  maxSpellLevelForWizard,
  parseRandomSpellbookSearchParams,
  spellsOfInterestCount,
  startingFirstLevelSpellCount,
  totalNonCantripSpellCount,
  type SpellbookResult,
  type RandomSpellbookUrlState,
  type WizardSourceOption,
} from "@/lib/random-spellbook";
import { RANDOM_SPELLBOOK_TOOLTIPS } from "@/lib/random-spellbook/tooltips";
import { ARCANE_SCHOOLS, type ArcaneSchool } from "@/lib/spell-utils";

const SPECIALIZATION_OPTIONS = ARCANE_SCHOOLS.filter((school) => school !== "Universal");

function StepHeading({
  step,
  title,
  tooltip,
}: {
  step: number;
  title: string;
  tooltip: string;
}) {
  return (
    <h2>
      <span className="tool-step-num tool-step-num--muted">{step}</span>
      <span className="random-spellbook-step-title">{title}</span>
      <FieldTooltip text={tooltip} />
    </h2>
  );
}

function CompactNumberField({
  id,
  label,
  tooltip,
  value,
  onChange,
  min,
  max,
}: {
  id: string;
  label: string;
  tooltip: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="tool-field random-spellbook-compact-field">
      <LabelWithTooltip htmlFor={id} label={label} tooltip={tooltip} />
      <input
        id={id}
        type="number"
        className="tool-input random-spellbook-compact-input"
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function schoolOptions(exclude?: ArcaneSchool | null): MultiSelectOption[] {
  return ARCANE_SCHOOLS.filter((school) => school !== exclude).map((school) => ({
    value: school,
    label: school,
  }));
}

function toUrlState(input: {
  wizardLevel: number;
  intModifier: number;
  selectedSources: string[];
  specialization: ArcaneSchool | "";
  prohibitedSchools: ArcaneSchool[];
  interestPerLevel: number;
  seedInput: string;
}): RandomSpellbookUrlState {
  return {
    wizardLevel: input.wizardLevel,
    intModifier: input.intModifier,
    selectedSources: input.selectedSources,
    specialization: input.specialization,
    prohibitedSchools: input.prohibitedSchools,
    interestPerLevel: input.interestPerLevel,
    seed: input.seedInput,
  };
}

export function RandomSpellbook({
  sourceOptions,
  defaultSources,
}: {
  sourceOptions: WizardSourceOption[];
  defaultSources: string[];
}) {
  const nonce = useSessionNonce();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const validSourceAbbrevs = useMemo(
    () => sourceOptions.map((source) => source.abbrev),
    [sourceOptions],
  );

  const initialUrlState = useMemo(
    () =>
      parseRandomSpellbookSearchParams(
        Object.fromEntries(searchParams.entries()),
        validSourceAbbrevs.length > 0 ? validSourceAbbrevs : defaultSources,
      ),
    [searchParams, validSourceAbbrevs, defaultSources],
  );

  const [wizardLevel, setWizardLevel] = useState(initialUrlState.wizardLevel);
  const [intModifier, setIntModifier] = useState(initialUrlState.intModifier);
  const [selectedSources, setSelectedSources] = useState(
    initialUrlState.selectedSources.length > 0 ? initialUrlState.selectedSources : defaultSources,
  );
  const [specialization, setSpecialization] = useState<ArcaneSchool | "">(
    initialUrlState.specialization,
  );
  const [prohibitedSchools, setProhibitedSchools] = useState<ArcaneSchool[]>(
    initialUrlState.prohibitedSchools,
  );
  const [seedInput, setSeedInput] = useState(initialUrlState.seed);
  const [interestPerLevel, setInterestPerLevel] = useState(initialUrlState.interestPerLevel);
  const [result, setResult] = useState<SpellbookResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const autoGenerateAttempted = useRef(false);

  const clampedLevel = Math.min(20, Math.max(1, wizardLevel));
  const previewMaxLevel = maxSpellLevelForWizard(clampedLevel);
  const previewStartingSpells = startingFirstLevelSpellCount(intModifier);
  const previewTotalSpells = totalNonCantripSpellCount(clampedLevel, intModifier);
  const specializationValue = specialization || null;

  const urlState = useMemo(
    () =>
      toUrlState({
        wizardLevel: clampedLevel,
        intModifier,
        selectedSources,
        specialization,
        prohibitedSchools,
        interestPerLevel,
        seedInput,
      }),
    [
      clampedLevel,
      intModifier,
      selectedSources,
      specialization,
      prohibitedSchools,
      interestPerLevel,
      seedInput,
    ],
  );

  const sourceMultiSelectOptions = useMemo<MultiSelectOption[]>(
    () =>
      sourceOptions.map((source) => ({
        value: source.abbrev,
        label: `${source.name} (${source.spellCount})`,
      })),
    [sourceOptions],
  );

  const handleWizardLevelChange = useCallback((nextLevel: number) => {
    setWizardLevel(nextLevel);
    const clamped = Math.min(20, Math.max(1, nextLevel));
    setInterestPerLevel(spellsOfInterestCount(clamped));
  }, []);

  useEffect(() => {
    const params = buildRandomSpellbookSearchParams(urlState);
    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery === currentQuery) return;

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [urlState, pathname, router, searchParams]);

  const runGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setShareStatus(null);

    if (selectedSources.length === 0) {
      setError("Select at least one source.");
      setLoading(false);
      return;
    }

    const poolResult = await fetchWizardSpellPool({
      sourceAbbrevs: selectedSources,
      nonce,
    });

    if (!poolResult.success || !poolResult.spells) {
      setError(poolResult.error ?? "Could not load spells for the selected sources.");
      setLoading(false);
      return;
    }

    if (poolResult.spells.length === 0) {
      setError("No wizard spells found for the selected sources.");
      setLoading(false);
      return;
    }

    const parsedSeed = seedInput.trim() === "" ? undefined : Number(seedInput);
    if (parsedSeed != null && !Number.isFinite(parsedSeed)) {
      setError("Seed must be a number.");
      setLoading(false);
      return;
    }

    const generated = generateSpellbook(
      {
        wizardLevel: clampedLevel,
        intModifier,
        specialization: specializationValue,
        prohibitedSchools,
        interestPerLevel: Math.max(1, interestPerLevel),
        seed: parsedSeed,
      },
      poolResult.spells,
    );

    setResult(generated);
    setSeedInput(String(generated.seed));
    setLoading(false);
  }, [
    selectedSources,
    nonce,
    seedInput,
    clampedLevel,
    intModifier,
    specializationValue,
    prohibitedSchools,
    interestPerLevel,
  ]);

  useEffect(() => {
    if (autoGenerateAttempted.current) return;
    if (!initialUrlState.seed.trim()) return;

    autoGenerateAttempted.current = true;
    void runGenerate();
  }, [initialUrlState.seed, runGenerate]);

  async function handleCopyLink() {
    setShareStatus(null);
    const params = buildRandomSpellbookSearchParams(urlState);
    const query = params.toString();
    const href = `${window.location.origin}${pathname}${query ? `?${query}` : ""}`;

    try {
      await navigator.clipboard.writeText(href);
      setShareStatus("Link copied.");
    } catch {
      setShareStatus("Could not copy link.");
    }
  }

  return (
    <div className="random-spellbook-calculator">
      <div className="random-spellbook-form">
        <div className="random-spellbook-form-steps">
          <section className="tool-step entity-filters random-spellbook-step">
            <StepHeading
              step={1}
              title="Wizard"
              tooltip={RANDOM_SPELLBOOK_TOOLTIPS.wizardSection}
            />
            <div className="random-spellbook-wizard-row">
              <CompactNumberField
                id="wizard-level"
                label="Wizard level"
                tooltip={RANDOM_SPELLBOOK_TOOLTIPS.wizardLevel}
                value={wizardLevel}
                min={1}
                max={20}
                onChange={handleWizardLevelChange}
              />
              <CompactNumberField
                id="int-modifier"
                label="Int modifier"
                tooltip={RANDOM_SPELLBOOK_TOOLTIPS.intModifier}
                value={intModifier}
                min={-4}
                max={10}
                onChange={setIntModifier}
              />
              <CompactNumberField
                id="interest-per-level"
                label="Interest (per level)"
                tooltip={RANDOM_SPELLBOOK_TOOLTIPS.interestPerLevel}
                value={interestPerLevel}
                min={1}
                max={20}
                onChange={setInterestPerLevel}
              />
            </div>
            <blockquote className="random-spellbook-readout">
              <span>
                L{clampedLevel}: {previewStartingSpells} at 1st · {previewTotalSpells} total in
                book
              </span>
              <FieldTooltip text={RANDOM_SPELLBOOK_TOOLTIPS.preview} />
            </blockquote>
            <div className="tool-field random-spellbook-seed-field">
              <LabelWithTooltip
                htmlFor="seed"
                label="Seed (optional)"
                tooltip={RANDOM_SPELLBOOK_TOOLTIPS.seed}
              />
              <input
                id="seed"
                type="text"
                inputMode="numeric"
                className="tool-input"
                value={seedInput}
                placeholder="empty = random"
                onChange={(event) => setSeedInput(event.target.value)}
              />
            </div>
            <p className="random-spellbook-meta-line">
              Maximum castable spell level:{" "}
              <strong>{previewMaxLevel}</strong>
              <FieldTooltip text={RANDOM_SPELLBOOK_TOOLTIPS.maxCastLevel} />
            </p>
          </section>

          <section className="tool-step entity-filters random-spellbook-step">
            <StepHeading
              step={2}
              title="Sources & schools"
              tooltip={RANDOM_SPELLBOOK_TOOLTIPS.sourcesSection}
            />
            <div className="random-spellbook-sources-block">
              <MultiSelect
                label="Sources"
                tooltip={RANDOM_SPELLBOOK_TOOLTIPS.sources}
                options={sourceMultiSelectOptions}
                value={selectedSources}
                onChange={setSelectedSources}
                placeholder="Select sources"
              />
              <div className="random-spellbook-schools-grid">
                <div className="tool-field">
                  <LabelWithTooltip
                    htmlFor="specialization"
                    label="Specialization"
                    tooltip={RANDOM_SPELLBOOK_TOOLTIPS.specialization}
                  />
                  <select
                    id="specialization"
                    className="tool-select"
                    value={specialization}
                    onChange={(event) => {
                      const next = event.target.value as ArcaneSchool | "";
                      setSpecialization(next);
                      if (next) {
                        setProhibitedSchools((current) =>
                          current.filter((school) => school !== next),
                        );
                      }
                    }}
                  >
                    <option value="">None</option>
                    {SPECIALIZATION_OPTIONS.map((school) => (
                      <option key={school} value={school}>
                        {school}
                      </option>
                    ))}
                  </select>
                </div>
                <MultiSelect
                  label="Prohibited schools"
                  tooltip={RANDOM_SPELLBOOK_TOOLTIPS.prohibited}
                  options={schoolOptions(specializationValue)}
                  value={prohibitedSchools}
                  onChange={(next) => setProhibitedSchools(next as ArcaneSchool[])}
                  placeholder="None"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="random-spellbook-generate-bar">
          <span className="random-spellbook-share-wrap">
            <button
              type="button"
              className="tool-btn tool-btn-secondary random-spellbook-share-btn"
              onClick={() => void handleCopyLink()}
              disabled={loading}
            >
              <Link2 size={16} aria-hidden="true" />
              Copy link
            </button>
            <FieldTooltip text={RANDOM_SPELLBOOK_TOOLTIPS.shareLink} />
          </span>
          <button
            type="button"
            className="tool-btn tool-btn-primary random-spellbook-generate-btn"
            onClick={() => void runGenerate()}
            disabled={loading}
          >
            <Sparkles size={16} aria-hidden="true" />
            {loading ? "Generating…" : "Generate spellbook"}
          </button>
        </div>
        {shareStatus ? <p className="random-spellbook-share-status">{shareStatus}</p> : null}
      </div>

      <RandomSpellbookSummary
        result={result}
        error={error}
        loading={loading}
        wizardLevel={clampedLevel}
      />
    </div>
  );
}
