"use client";

import { useEffect, useState } from "react";

function Metric({
  label,
  value,
  tone = "fg",
}: {
  label: string;
  value: string;
  tone?: "fg" | "cyan" | "green";
}) {
  const color =
    tone === "cyan" ? "text-cyan" : tone === "green" ? "text-green" : "text-fg";
  return (
    <span className="flex items-center gap-1.5">
      <span className="label">{label}</span>
      <span className={`tnum text-[11px] ${color}`}>{value}</span>
    </span>
  );
}

export function StatusBar({ online }: { online: boolean | null }) {
  const [backup, setBackup] = useState("--:-- UTC");

  useEffect(() => {
    setBackup(new Date().toISOString().substr(11, 5) + " UTC");
  }, []);

  return (
    <footer className="flex h-9 shrink-0 items-center justify-between border-t border-line bg-base2/80 px-5 backdrop-blur">
      <div className="flex items-center gap-6">
        <Metric label="CPU Load" value="24.2%" tone="cyan" />
        <Metric label="Latency" value="12ms" tone="green" />
        <Metric label="Uptime" value="99.98%" tone="green" />
        <span className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              online === false ? "bg-red" : "bg-green"
            }`}
          />
          <span className="label">
            {online === false ? "Backend Offline" : "Online"}
          </span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Metric label="Last Backup" value={backup} />
        <span className="h-1.5 w-28 overflow-hidden rounded-full bg-line2">
          <span className="block h-full w-3/4 rounded-full bg-gradient-to-r from-cyandim to-cyan" />
        </span>
      </div>
    </footer>
  );
}
