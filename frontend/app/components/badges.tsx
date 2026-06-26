import React from "react";

const RISK_COLOR: Record<string, string> = {
  LOW: "text-term-green",
  MODERATE: "text-amber",
  MED: "text-amber",
  HIGH: "text-red",
};

export function RiskBadge({ risk }: { risk?: string }) {
  const r = (risk || "").toUpperCase();
  const cls = RISK_COLOR[r] || "text-gray";
  const border =
    r === "LOW"
      ? "border-term-green"
      : r === "HIGH"
        ? "border-red"
        : r === "MODERATE" || r === "MED"
          ? "border-amber"
          : "border-gray";
  return (
    <span
      className={`uplabel inline-block border px-1.5 py-0.5 text-[10px] ${border} ${cls}`}
    >
      {r || "N/A"}
    </span>
  );
}

export function EvidenceBadge({ level }: { level?: string }) {
  const l = (level || "").toUpperCase().replace("LEVEL_", "TIER ");
  return (
    <span className="bg-surfacehigh term-border border-gray px-1 text-[11px] text-foreground">
      {l || "—"}
    </span>
  );
}

/** Stitch literature/score bar: gray-bordered track, cyan fill, right label. */
export function ScoreBar({
  value,
  max = 1,
  label,
  fill = "bg-cyan",
}: {
  value: number;
  max?: number;
  label?: string;
  fill?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="bg-surfacehigh term-border h-3 flex-1 border-gray">
        <div className={`h-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
      {label !== undefined && (
        <span className="w-8 text-right text-[11px] tabular-nums text-gray">
          {label}
        </span>
      )}
    </div>
  );
}

/** Segmented toxicity risk bar used in the treatment cards (Stitch). */
export function ToxicityRiskBar({ risk }: { risk?: string }) {
  const r = (risk || "").toUpperCase();
  const { width, color } =
    r === "HIGH"
      ? { width: "75%", color: "bg-red" }
      : r === "MODERATE" || r === "MED"
        ? { width: "50%", color: "bg-amber" }
        : r === "LOW"
          ? { width: "25%", color: "bg-term-green" }
          : { width: "10%", color: "bg-gray" };
  return (
    <div className="bg-surfacehigh flex h-2 w-32">
      <div className={`h-full ${color}`} style={{ width }} />
    </div>
  );
}
