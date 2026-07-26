import type { StaffRoleKey } from "./types";

export type StaffMember = {
  key: StaffRoleKey;
  label: string;
  monthlyWage: number;
};

export const STAFF_MEMBERS: StaffMember[] = [
  { key: "acolyte", label: "Acolyte", monthlyWage: 30 },
  { key: "alchemist", label: "Alchemist", monthlyWage: 30 },
  { key: "groom", label: "Animal tender/groom", monthlyWage: 4.5 },
  { key: "apprentice", label: "Apprentice spellcaster", monthlyWage: 30 },
  { key: "architect", label: "Architect/engineer", monthlyWage: 15 },
  { key: "artisan", label: "Artisan", monthlyWage: 18 },
  { key: "bartender", label: "Bartender/Innkeeper", monthlyWage: 6 },
  { key: "butler", label: "Butler", monthlyWage: 15 },
  { key: "cavalry", label: "Cavalry", monthlyWage: 12 },
  { key: "clerk", label: "Clerk", monthlyWage: 12 },
  { key: "cook", label: "Cook", monthlyWage: 3 },
  { key: "entertainer", label: "Entertainer/Performer", monthlyWage: 12 },
  { key: "guard", label: "Guard", monthlyWage: 6 },
  { key: "laborer", label: "Laborer", monthlyWage: 3 },
  { key: "librarian", label: "Librarian", monthlyWage: 12 },
  { key: "maid", label: "Maid", monthlyWage: 3 },
  { key: "mason", label: "Mason/craftsperson", monthlyWage: 9 },
  { key: "officer", label: "Officer, military", monthlyWage: 18 },
  { key: "sage", label: "Sage", monthlyWage: 60 },
  { key: "scribe", label: "Scribe", monthlyWage: 9 },
  { key: "servant", label: "Servant", monthlyWage: 3 },
  { key: "soldier", label: "Soldier", monthlyWage: 6 },
  { key: "smith", label: "Smith", monthlyWage: 12 },
  { key: "torturer", label: "Torturer/Inquisitor", monthlyWage: 9 },
  { key: "valet", label: "Valet/Lackey", monthlyWage: 6 },
];

export const STAFF_MAP = new Map(STAFF_MEMBERS.map((s) => [s.key, s]));

export function getStaffWage(role: StaffRoleKey): number {
  return STAFF_MAP.get(role)?.monthlyWage ?? 0;
}
