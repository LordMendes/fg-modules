const FRACTION_LABELS: Record<number, string> = {
  0.125: "1/8",
  0.167: "1/6",
  0.25: "1/4",
  0.333: "1/3",
  0.5: "1/2",
};

export function formatEl(el: number | null): string {
  if (el === null) return "—";
  const fraction = FRACTION_LABELS[el];
  if (fraction) return fraction;
  if (Number.isInteger(el)) return String(el);
  return el.toFixed(1).replace(/\.0$/, "");
}

export function formatXp(xp: number): string {
  return xp.toLocaleString("en-US");
}
