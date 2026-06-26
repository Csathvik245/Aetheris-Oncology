"use client";
import { useEffect, useState } from "react";

export function Header({ online }: { online: boolean | null }) {
  const [now, setNow] = useState<string>("--:--:-- UTC");

  useEffect(() => {
    const tick = () =>
      // Stitch shows UTC ISO time (HH:MM:SS UTC)
      setNow(new Date().toISOString().substr(11, 8) + " UTC");
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="term-border-b flex h-12 shrink-0 items-center justify-between border-b border-grid bg-black px-3">
      <div className="flex items-center gap-4">
        <span className="text-[24px] font-700 leading-8 tracking-[0.1em] text-cyan">
          ONCOLOGY//ORCHESTRATOR
        </span>
      </div>

      <div className="flex items-center gap-6">
        {online === false && (
          <span className="uplabel border border-red px-2 py-0.5 text-[10px] text-red">
            ● BACKEND OFFLINE
          </span>
        )}
        {online === null && (
          <span className="uplabel border border-gray px-2 py-0.5 text-[10px] text-gray">
            ● PROBING…
          </span>
        )}

        <span className="flex items-center gap-2 text-[12px] text-onsurfacevar">
          <span className="material-symbols-outlined text-sm">schedule</span>
          <span className="tabular-nums" suppressHydrationWarning>
            {now}
          </span>
        </span>

        <div className="flex items-center gap-2 text-[18px] font-600 tracking-[0.05em] text-cyan">
          <span className="text-xs blink">●</span>
          <span>LIVE</span>
          <span className="material-symbols-outlined ml-2">sensors</span>
        </div>
      </div>
    </header>
  );
}
