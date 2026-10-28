import {
  DEFAULT_POINTS,
  DEFAULT_SCORE_MAX,
  DEFAULT_SCORE_MIN,
  clampBudget,
  normalizeRange,
} from "@/lib/point-buy";

export type PointBuyUrlState = {
  points: number;
  min: number;
  max: number;
};

export const DEFAULT_POINT_BUY_URL_STATE: PointBuyUrlState = {
  points: DEFAULT_POINTS,
  min: DEFAULT_SCORE_MIN,
  max: DEFAULT_SCORE_MAX,
};

function readParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return undefined;
  return parsed;
}

export function parsePointBuySearchParams(
  searchParams: Record<string, string | string[] | undefined> = {},
): PointBuyUrlState {
  const defaults = DEFAULT_POINT_BUY_URL_STATE;
  const pointsRaw = parseIntOrUndefined(readParam(searchParams, "points"));
  const minRaw = parseIntOrUndefined(readParam(searchParams, "min"));
  const maxRaw = parseIntOrUndefined(readParam(searchParams, "max"));

  const points =
    pointsRaw === undefined ? defaults.points : clampBudget(pointsRaw);
  const range = normalizeRange({
    min: minRaw === undefined ? defaults.min : minRaw,
    max: maxRaw === undefined ? defaults.max : maxRaw,
  });

  return {
    points,
    min: range.min,
    max: range.max,
  };
}

/**
 * Always writes points, min, and max so a DM can copy the address bar
 * as a complete table preset.
 */
export function buildPointBuySearchParams(
  state: PointBuyUrlState,
): URLSearchParams {
  const points = clampBudget(state.points);
  const range = normalizeRange({ min: state.min, max: state.max });
  const params = new URLSearchParams();
  params.set("points", String(points));
  params.set("min", String(range.min));
  params.set("max", String(range.max));
  return params;
}

export function serializePointBuyUrlState(state: PointBuyUrlState): string {
  return buildPointBuySearchParams(state).toString();
}
