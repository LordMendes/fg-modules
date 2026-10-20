export const INN_QUALITIES = ["poor", "common", "good"] as const;
export type InnQuality = (typeof INN_QUALITIES)[number];

export const INN_PATRON_TYPES = ["townsfolk", "adventurers"] as const;
export type InnPatronType = (typeof INN_PATRON_TYPES)[number];

export type InnInput = {
  quality: InnQuality;
  patrons: InnPatronType;
  seed: number;
};

export type InnMenuEntry = {
  name: string;
  price: string;
  priceCp: number;
};

export type InnRumor = {
  text: string;
  unreliable: boolean;
};

export type InnResult = {
  name: string;
  namePattern: string;
  location: string;
  description: string;
  keeper: string;
  dishes: InnMenuEntry[];
  drinks: InnMenuEntry[];
  patrons: string[];
  rumors: InnRumor[];
};

export const INN_SECTION_SALT = {
  name: 1,
  location: 2,
  description: 3,
  keeper: 4,
  menu: 5,
  patrons: 6,
  rumors: 7,
} as const;

export type InnSection = keyof typeof INN_SECTION_SALT;

export const QUALITY_LABELS: Record<InnQuality, string> = {
  poor: "Poor",
  common: "Common",
  good: "Good",
};

export const PATRON_TYPE_LABELS: Record<InnPatronType, string> = {
  townsfolk: "Townsfolk",
  adventurers: "Adventurers",
};
