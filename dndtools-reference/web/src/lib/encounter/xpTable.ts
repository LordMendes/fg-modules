/** SRD XP awards per PC for defeating one creature of the given CR (party of 4). */
const XP_BY_CR: ReadonlyArray<[number, number]> = [
  [0.125, 50],
  [0.167, 65],
  [0.25, 100],
  [0.333, 135],
  [0.5, 200],
  [1, 300],
  [2, 600],
  [3, 900],
  [4, 1350],
  [5, 1800],
  [6, 2700],
  [7, 3600],
  [8, 4800],
  [9, 6400],
  [10, 5400],
  [11, 7200],
  [12, 9600],
  [13, 12800],
  [14, 16400],
  [15, 20800],
  [16, 25600],
  [17, 32400],
  [18, 41600],
  [19, 52800],
  [20, 67200],
  [21, 85200],
  [22, 108000],
  [23, 136800],
  [24, 173600],
  [25, 220800],
];

export function xpForCR(cr: number): number {
  if (cr <= 0) return 0;

  const exact = XP_BY_CR.find(([c]) => c === cr);
  if (exact) return exact[1];

  if (cr < XP_BY_CR[0][0]) return XP_BY_CR[0][1];
  if (cr > XP_BY_CR[XP_BY_CR.length - 1][0]) {
    const [, lastXp] = XP_BY_CR[XP_BY_CR.length - 1];
    const [, prevXp] = XP_BY_CR[XP_BY_CR.length - 2];
    const ratio = lastXp / prevXp;
    const steps = cr - XP_BY_CR[XP_BY_CR.length - 1][0];
    return Math.round(lastXp * Math.pow(ratio, steps));
  }

  for (let i = 0; i < XP_BY_CR.length - 1; i++) {
    const [crLow, xpLow] = XP_BY_CR[i];
    const [crHigh, xpHigh] = XP_BY_CR[i + 1];
    if (cr >= crLow && cr <= crHigh) {
      if (cr === crLow) return xpLow;
      if (cr === crHigh) return xpHigh;
      const t = (cr - crLow) / (crHigh - crLow);
      return Math.round(xpLow + t * (xpHigh - xpLow));
    }
  }

  return 0;
}

/** Reverse-lookup EL from total XP per PC (mixed-CR encounter method). */
export function elFromTotalXp(totalXpPerPc: number): number | null {
  if (totalXpPerPc <= 0) return null;

  for (const [cr, xp] of XP_BY_CR) {
    if (xp === totalXpPerPc) return cr;
  }

  let floorCr: number | null = null;
  for (const [cr, xp] of XP_BY_CR) {
    if (xp <= totalXpPerPc) {
      floorCr = cr;
    } else {
      break;
    }
  }

  if (floorCr !== null) return floorCr;

  if (totalXpPerPc > XP_BY_CR[XP_BY_CR.length - 1][1]) {
    const lastCr = XP_BY_CR[XP_BY_CR.length - 1][0];
    const lastXp = XP_BY_CR[XP_BY_CR.length - 1][1];
    const ratio = XP_BY_CR[XP_BY_CR.length - 1][1] / XP_BY_CR[XP_BY_CR.length - 2][1];
    let cr = lastCr;
    let xp = lastXp;
    while (xp < totalXpPerPc) {
      cr += 1;
      xp = Math.round(xp * ratio);
    }
    const diffHigh = Math.abs(totalXpPerPc - xp);
    const diffLow = Math.abs(totalXpPerPc - Math.round(xp / ratio));
    return diffHigh <= diffLow ? cr : cr - 1;
  }

  return XP_BY_CR[0][0];
}
