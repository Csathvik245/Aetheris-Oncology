"use client";

import type { View } from "./TopNav";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`} style={{ fontSize: 18 }}>
      {name}
    </span>
  );
}

const NAV: { label: string; icon: string; view: View }[] = [
  { label: "Analysis Dashboard", icon: "analytics", view: "orchestrator" },
  { label: "Agent Orchestration", icon: "hub", view: "agents" },
  { label: "Patient Records", icon: "folder_shared", view: "patients" },
];

export function Sidebar({
  activeNodes,
  onNewAnalysis,
  busy,
  view,
  onNav,
  onOpenLogs,
  onOpenSupport,
}: {
  activeNodes: number;
  onNewAnalysis: () => void;
  busy?: boolean;
  view: View;
  onNav: (v: View) => void;
  onOpenLogs: () => void;
  onOpenSupport: () => void;
}) {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col justify-between border-r border-line bg-base2/60 px-3 py-4">
      <div className="flex flex-col gap-4">
        {/* core orchestrator status */}
        <div className="px-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green opacity-60 blink" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green" />
            </span>
            <span className="font-display text-[13px] font-semibold text-fg">
              Core Orchestrator
            </span>
          </div>
          <div className="label mt-1 ml-4">Active Nodes: {activeNodes}</div>
        </div>

        {/* new analysis */}
        <button
          onClick={onNewAnalysis}
          disabled={busy}
          className="glow-cyan flex items-center justify-center gap-1.5 rounded-lg bg-cyan py-2.5 text-[13px] font-semibold text-black transition-transform hover:scale-[1.01] disabled:opacity-60"
        >
          <Icon name="add" className="text-[18px]" />
          {busy ? "Analyzing…" : "New Analysis"}
        </button>

        {/* nav */}
        <nav className="mt-2 flex flex-col gap-1">
          {NAV.map((n) => {
            const active = view === n.view;
            return (
              <button
                key={n.label}
                onClick={() => onNav(n.view)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors ${
                  active
                    ? "border border-cyan/25 bg-cyan/10 font-medium text-cyan"
                    : "text-fgdim hover:bg-panel hover:text-fg"
                }`}
              >
                <Icon name={n.icon} />
                {n.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-1 border-t border-line pt-3">
        <button
          onClick={onOpenLogs}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-fgdim hover:bg-panel hover:text-fg"
        >
          <Icon name="terminal" />
          System Logs
        </button>
        <button
          onClick={onOpenSupport}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-fgdim hover:bg-panel hover:text-fg"
        >
          <Icon name="help_outline" />
          Support
        </button>
      </div>
    </aside>
  );
}
