import type { FollowerCounts, LeadershipTableRow } from "./types";

function followers(
  level1: number,
  level2 = 0,
  level3 = 0,
  level4 = 0,
  level5 = 0,
  level6 = 0,
  level7?: number,
  level8?: number,
  level9?: number,
  level10?: number,
): FollowerCounts {
  return {
    level1,
    level2,
    level3,
    level4,
    level5,
    level6,
    ...(level7 !== undefined ? { level7 } : {}),
    ...(level8 !== undefined ? { level8 } : {}),
    ...(level9 !== undefined ? { level9 } : {}),
    ...(level10 !== undefined ? { level10 } : {}),
  };
}

function row(
  score: number,
  scoreLabel: string,
  cohortLevel: number | null,
  cohortLabel: string,
  followerValues: FollowerCounts,
): LeadershipTableRow {
  return {
    score,
    scoreLabel,
    cohortLevel,
    cohortLabel,
    followers: followerValues,
  };
}

/** PHB / DMG Table 2-25: Leadership */
export const PHB_LEADERSHIP_TABLE: LeadershipTableRow[] = [
  row(1, "1 or lower", null, "—", followers(0)),
  row(2, "2", 1, "1st", followers(0)),
  row(3, "3", 2, "2nd", followers(0)),
  row(4, "4", 3, "3rd", followers(0)),
  row(5, "5", 3, "3rd", followers(0)),
  row(6, "6", 4, "4th", followers(0)),
  row(7, "7", 5, "5th", followers(0)),
  row(8, "8", 5, "5th", followers(0)),
  row(9, "9", 6, "6th", followers(0)),
  row(10, "10", 7, "7th", followers(5)),
  row(11, "11", 7, "7th", followers(6)),
  row(12, "12", 8, "8th", followers(8)),
  row(13, "13", 9, "9th", followers(10, 1)),
  row(14, "14", 10, "10th", followers(15, 1)),
  row(15, "15", 10, "10th", followers(20, 2, 1)),
  row(16, "16", 11, "11th", followers(25, 2, 1)),
  row(17, "17", 12, "12th", followers(30, 3, 1, 1)),
  row(18, "18", 12, "12th", followers(35, 3, 1, 1)),
  row(19, "19", 13, "13th", followers(40, 4, 2, 1, 1)),
  row(20, "20", 14, "14th", followers(50, 5, 3, 2, 1)),
  row(21, "21", 15, "15th", followers(60, 6, 3, 2, 1, 1)),
  row(22, "22", 15, "15th", followers(75, 7, 4, 2, 2, 1)),
  row(23, "23", 16, "16th", followers(90, 9, 5, 3, 2, 1)),
  row(24, "24", 17, "17th", followers(110, 11, 6, 3, 2, 1)),
  row(25, "25 or higher", 17, "17th", followers(135, 13, 7, 4, 2, 2)),
];

/** Epic Level Handbook Table 1-33: Epic Leadership */
export const EPIC_LEADERSHIP_TABLE: LeadershipTableRow[] = [
  row(25, "25", 17, "17th", followers(135, 13, 7, 4, 2, 2, 1)),
  row(26, "26", 18, "18th", followers(160, 16, 8, 4, 2, 2, 1)),
  row(27, "27", 18, "18th", followers(190, 19, 10, 5, 3, 2, 1)),
  row(28, "28", 19, "19th", followers(220, 22, 11, 6, 3, 2, 1)),
  row(29, "29", 19, "19th", followers(260, 26, 13, 7, 4, 2, 1)),
  row(30, "30", 20, "20th", followers(300, 30, 15, 8, 4, 2, 1)),
  row(31, "31", 20, "20th", followers(350, 35, 18, 9, 5, 3, 2, 1)),
  row(32, "32", 21, "21st", followers(400, 40, 20, 10, 5, 3, 2, 1)),
  row(33, "33", 21, "21st", followers(460, 46, 23, 12, 6, 3, 2, 1)),
  row(34, "34", 22, "22nd", followers(520, 52, 26, 13, 6, 3, 2, 1)),
  row(35, "35", 22, "22nd", followers(590, 59, 30, 15, 8, 4, 2, 1)),
  row(36, "36", 23, "23rd", followers(660, 66, 33, 17, 9, 5, 3, 2, 1)),
  row(37, "37", 23, "23rd", followers(740, 74, 37, 19, 10, 5, 3, 2, 1)),
  row(38, "38", 24, "24th", followers(820, 82, 41, 21, 11, 6, 3, 2, 1)),
  row(39, "39", 24, "24th", followers(910, 91, 46, 23, 12, 6, 3, 2, 1)),
  row(
    40,
    "40 or higher",
    25,
    "25th",
    followers(1000, 100, 50, 25, 13, 7, 4, 2, 1),
  ),
];

export function formatOrdinalLevel(level: number): string {
  const suffix =
    level % 100 >= 11 && level % 100 <= 13
      ? "th"
      : level % 10 === 1
        ? "st"
        : level % 10 === 2
          ? "nd"
          : level % 10 === 3
            ? "rd"
            : "th";
  return `${level}${suffix}`;
}
