"use client";

import { useId, useState } from "react";
import { CircleHelp } from "lucide-react";

export function FieldTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className={`field-tooltip-wrap${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="field-tooltip-trigger"
        aria-describedby={tooltipId}
        aria-expanded={open}
        aria-label="More information"
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
      >
        <CircleHelp size={14} aria-hidden="true" />
      </button>
      <span className="field-tooltip" role="tooltip" id={tooltipId}>
        {text}
      </span>
    </span>
  );
}

export function LabelWithTooltip({
  htmlFor,
  label,
  tooltip,
}: {
  htmlFor?: string;
  label: string;
  tooltip: string;
}) {
  return (
    <span className="tool-label-with-tooltip">
      <label htmlFor={htmlFor} className="tool-label">
        {label}
      </label>
      <FieldTooltip text={tooltip} />
    </span>
  );
}
