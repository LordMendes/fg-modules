"use client";

import { useId } from "react";
import type { DieSides } from "@/lib/dice/types";

type DieIconProps = {
  sides: DieSides;
  color?: string;
  className?: string;
  /** Show dN label inside the icon (default true). */
  labeled?: boolean;
};

/** Flat polyhedron silhouettes for the tray, tinted by skin color. */
export function DieIcon({
  sides,
  color = "#B8860B",
  className,
  labeled = true,
}: DieIconProps) {
  const uid = useId().replace(/:/g, "");
  const gradId = `die-grad-${sides}-${uid}`;
  const label = `d${sides}`;
  const stroke = "rgba(26, 18, 8, 0.55)";

  return (
    <svg
      className={["dice-die-icon", className].filter(Boolean).join(" ")}
      viewBox="0 0 48 48"
      width="48"
      height="48"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.72" />
        </linearGradient>
      </defs>
      {sides === 4 ? (
        <path
          d="M24 4 L44 40 L4 40 Z"
          fill={`url(#${gradId})`}
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      ) : null}
      {sides === 6 ? (
        <rect
          x="8"
          y="8"
          width="32"
          height="32"
          rx="3"
          fill={`url(#${gradId})`}
          stroke={stroke}
          strokeWidth="1.5"
        />
      ) : null}
      {sides === 8 ? (
        <path
          d="M24 3 L42 24 L24 45 L6 24 Z"
          fill={`url(#${gradId})`}
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      ) : null}
      {sides === 10 ? (
        <path
          d="M24 3 L40 18 L32 44 L16 44 L8 18 Z"
          fill={`url(#${gradId})`}
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      ) : null}
      {sides === 12 ? (
        <path
          d="M24 3 L38 10 L45 24 L38 38 L24 45 L10 38 L3 24 L10 10 Z"
          fill={`url(#${gradId})`}
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      ) : null}
      {sides === 20 ? (
        <path
          d="M24 2 L42 14 L42 34 L24 46 L6 34 L6 14 Z"
          fill={`url(#${gradId})`}
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      ) : null}
      {sides === 100 ? (
        <>
          <circle
            cx="24"
            cy="24"
            r="18"
            fill={`url(#${gradId})`}
            stroke={stroke}
            strokeWidth="1.5"
          />
          <circle
            cx="24"
            cy="24"
            r="11"
            fill="none"
            stroke={stroke}
            strokeWidth="1"
            opacity="0.45"
          />
        </>
      ) : null}
      {labeled ? (
        <text
          x="24"
          y="27"
          textAnchor="middle"
          fontSize={sides === 100 ? 9 : 11}
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
          fill="#1a1208"
        >
          {label}
        </text>
      ) : null}
    </svg>
  );
}
