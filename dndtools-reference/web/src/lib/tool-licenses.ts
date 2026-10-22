export type ToolLicensePart =
  | { type: "text"; value: string }
  | { type: "link"; href: string; label: string };

export type ToolLicenseNotice = {
  parts: ToolLicensePart[];
};

export const TOOL_LICENSES: Record<string, ToolLicenseNotice> = {
  "dungeon-generator": {
    parts: [
      {
        type: "text",
        value: "Layout algorithm adapted from the ",
      },
      {
        type: "link",
        href: "https://donjon.bin.sh/code/dungeon/",
        label: "Random Dungeon Generator",
      },
      {
        type: "text",
        value: " by drow, with modifications. Licensed under ",
      },
      {
        type: "link",
        href: "https://creativecommons.org/licenses/by-nc/3.0/",
        label: "CC BY-NC 3.0",
      },
      { type: "text", value: "." },
    ],
  },
  "name-generator": {
    parts: [
      {
        type: "text",
        value: "Markov name generation follows the ",
      },
      {
        type: "link",
        href: "https://donjon.bin.sh/code/name/",
        label: "Name Generator",
      },
      {
        type: "text",
        value: " by drow, released to the public domain.",
      },
    ],
  },
  "fractal-world": {
    parts: [
      {
        type: "text",
        value: "Adapted from the ",
      },
      {
        type: "link",
        href: "https://donjon.bin.sh/code/world/",
        label: "Fractal World Generator",
      },
      {
        type: "text",
        value:
          " by drow, based on worldgen by John Olsson. worldgen is licensed under the ",
      },
      {
        type: "link",
        href: "https://www.gnu.org/licenses/old-licenses/gpl-2.0.html",
        label: "GNU GPL v2",
      },
      { type: "text", value: "." },
    ],
  },
};

export function licenseNoticeForTool(
  toolKey: string,
): ToolLicenseNotice | undefined {
  return TOOL_LICENSES[toolKey];
}
