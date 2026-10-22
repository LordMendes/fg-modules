export type FractalProjection =
  | "square"
  | "mercator"
  | "transverse-mercator"
  | "icosahedral"
  | "mollweide"
  | "sinusoidal"
  | "spherical"
  | "polar-orthographic"
  | "polar-stereographic"
  | "polar-gnomonic";

export type FractalPalette =
  | "atlas"
  | "antique"
  | "barren"
  | "martian"
  | "chthonian"
  | "greyscale"
  | "landmask";

export type FractalInput = {
  projection: FractalProjection;
  palette: FractalPalette;
  water: number;
  ice: number;
  height: number;
  iterations: number;
  rotation: number;
};

export type SurfaceKind = "sea" | "lowland" | "highland" | "ice";

export type FractalResult = {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
};

export const DEFAULT_FRACTAL_INPUT: FractalInput = {
  projection: "square",
  palette: "atlas",
  water: 60,
  ice: 8,
  height: 480,
  iterations: 4,
  rotation: 0,
};

export const FRACTAL_PROJECTIONS: { value: FractalProjection; label: string }[] =
  [
    { value: "square", label: "Square (equirectangular)" },
    { value: "mercator", label: "Mercator" },
    { value: "transverse-mercator", label: "Transverse Mercator" },
    { value: "mollweide", label: "Mollweide" },
    { value: "sinusoidal", label: "Sinusoidal" },
    { value: "spherical", label: "Spherical" },
    { value: "icosahedral", label: "Icosahedral" },
    { value: "polar-orthographic", label: "Polar orthographic" },
    { value: "polar-stereographic", label: "Polar stereographic" },
    { value: "polar-gnomonic", label: "Polar gnomonic" },
  ];

export const FRACTAL_PALETTES: { value: FractalPalette; label: string }[] = [
  { value: "atlas", label: "Atlas" },
  { value: "antique", label: "Antique" },
  { value: "barren", label: "Barren" },
  { value: "martian", label: "Martian" },
  { value: "chthonian", label: "Chthonian" },
  { value: "greyscale", label: "Greyscale" },
  { value: "landmask", label: "Landmask" },
];
