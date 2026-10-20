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

/** DMG Table 3-2: XP for one creature at a given party level (columns CR 1-20). */
const XP_BY_PARTY_LEVEL: readonly (readonly number[])[] = [
  [300, 600, 900, 1350, 1800, 2700, 3600, 5400, 7200, 10800, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [300, 600, 900, 1350, 1800, 2700, 3600, 5400, 7200, 10800, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [300, 600, 900, 1350, 1800, 2700, 3600, 5400, 7200, 10800, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [300, 600, 800, 1200, 1600, 2400, 3200, 4800, 6400, 9600, 12800, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [300, 500, 750, 1000, 1500, 2250, 3000, 4500, 6000, 9000, 12000, 18000, 0, 0, 0, 0, 0, 0, 0, 0],
  [300, 450, 600, 900, 1200, 1800, 2700, 3600, 5400, 7200, 10800, 14400, 21600, 0, 0, 0, 0, 0, 0, 0],
  [263, 350, 525, 700, 1050, 1400, 2100, 3150, 4200, 6300, 8400, 12600, 16800, 25200, 0, 0, 0, 0, 0, 0],
  [200, 300, 400, 600, 800, 1200, 1600, 2400, 3600, 4800, 7200, 9600, 14400, 19200, 28800, 0, 0, 0, 0, 0],
  [0, 225, 338, 450, 675, 900, 1350, 1800, 2700, 4050, 5400, 8100, 10800, 16200, 21600, 32400, 0, 0, 0, 0],
  [0, 0, 250, 375, 500, 750, 1000, 1500, 2000, 3000, 4500, 6000, 9000, 12000, 18000, 24000, 36000, 0, 0, 0],
  [0, 0, 0, 275, 413, 550, 825, 1100, 1650, 2200, 3300, 4950, 6600, 9900, 13200, 19800, 26400, 39600, 0, 0],
  [0, 0, 0, 0, 300, 450, 600, 900, 1200, 1800, 2400, 3600, 5400, 7200, 10800, 14400, 21600, 28800, 43200, 0],
  [0, 0, 0, 0, 0, 325, 488, 650, 975, 1300, 1950, 2600, 3900, 5850, 7800, 11700, 15600, 23400, 31200, 46800],
  [0, 0, 0, 0, 0, 0, 350, 525, 700, 1050, 1400, 2100, 2800, 4200, 6300, 8400, 12600, 16800, 25200, 33600],
  [0, 0, 0, 0, 0, 0, 0, 375, 563, 750, 1125, 1500, 2250, 3000, 4500, 6750, 9000, 13500, 18000, 27000],
  [0, 0, 0, 0, 0, 0, 0, 0, 400, 600, 800, 1200, 1600, 2400, 3200, 4800, 7200, 9600, 14400, 19200],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 425, 638, 850, 1275, 1700, 2550, 3400, 5100, 7650, 10200, 15300],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 450, 675, 900, 1350, 1800, 2700, 3600, 5400, 8100, 10800],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 475, 713, 950, 1425, 1900, 2850, 3800, 5700, 8550],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 500, 750, 1000, 1500, 2000, 3000, 4500, 6000],
];

const FRACTION_CR_DIVISOR: ReadonlyArray<[number, number]> = [
  [0.125, 8],
  [0.167, 6],
  [0.25, 4],
  [0.333, 3],
  [0.5, 2],
];

function xpFromTable(partyLevel: number, crColumn: number): number {
  const levelIndex = Math.min(20, Math.max(1, partyLevel)) - 1;
  const colIndex = Math.min(20, Math.max(1, crColumn)) - 1;
  return XP_BY_PARTY_LEVEL[levelIndex]?.[colIndex] ?? 0;
}

/** XP for defeating one creature of the given CR when the party level differs from CR. */
export function xpForPartyLevel(partyLevel: number, cr: number): number {
  if (cr <= 0 || partyLevel <= 0) return 0;

  const fraction = FRACTION_CR_DIVISOR.find(([value]) => value === cr);
  if (fraction) {
    const base = xpFromTable(partyLevel, 1);
    return Math.floor(base / fraction[1]);
  }

  if (cr > 20) return 0;

  if (!Number.isInteger(cr)) {
    const crFloor = Math.floor(cr);
    const crCeil = Math.ceil(cr);
    if (crFloor === crCeil) return xpFromTable(partyLevel, cr);
    const low = xpFromTable(partyLevel, crFloor);
    const high = xpFromTable(partyLevel, crCeil);
    const t = cr - crFloor;
    return Math.round(low + t * (high - low));
  }

  return xpFromTable(partyLevel, cr);
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
