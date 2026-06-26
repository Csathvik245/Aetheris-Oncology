"use client";

export type View = "orchestrator" | "patients" | "trials" | "agents";

const TABS: { label: string; view: View }[] = [
  { label: "Orchestrator", view: "orchestrator" },
  { label: "Patients", view: "patients" },
  { label: "Trials", view: "trials" },
];

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`} style={{ fontSize: 20 }}>
      {name}
    </span>
  );
}

export function TopNav({
  view,
  onNav,
  search,
  onSearch,
  onSubmitSearch,
  onBell,
  onSettings,
  onHelp,
}: {
  view: View;
  onNav: (v: View) => void;
  search: string;
  onSearch: (v: string) => void;
  onSubmitSearch: () => void;
  onBell: () => void;
  onSettings: () => void;
  onHelp: () => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-base2/80 px-5 backdrop-blur">
      <div className="flex items-center gap-8">
        <button onClick={() => onNav("orchestrator")} className="flex items-center gap-2">
          <span className="text-glow font-display text-[15px] font-semibold tracking-tight text-cyan">
            Aetheris Oncology
          </span>
        </button>
        <nav className="flex items-center gap-1">
          {TABS.map((t) => {
            const active = view === t.view;
            return (
              <button
                key={t.view}
                onClick={() => onNav(t.view)}
                className={`relative px-3 py-1.5 text-[13px] transition-colors ${
                  active ? "font-medium text-fg" : "text-fgdim hover:text-fg"
                }`}
              >
                {t.label}
                {active && (
                  <span className="absolute inset-x-2 -bottom-[14px] h-[2px] rounded-full bg-cyan" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-8 w-64 items-center gap-2 rounded-md border border-line bg-panel px-3 text-fgmute focus-within:border-cyan/40">
          <Icon name="search" className="text-[18px]" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmitSearch()}
            placeholder="Search Patient ID..."
            className="w-full bg-transparent text-[12px] text-fgdim placeholder:text-fgmute focus:outline-none"
          />
        </div>
        <button
          onClick={onBell}
          className="grid h-8 w-8 place-items-center rounded-md border border-line bg-panel text-fgdim hover:text-cyan"
        >
          <Icon name="notifications" />
        </button>
        <button
          onClick={onSettings}
          className="grid h-8 w-8 place-items-center rounded-md border border-line bg-panel text-fgdim hover:text-cyan"
        >
          <Icon name="settings" />
        </button>
        <button
          onClick={onHelp}
          className="grid h-8 w-8 place-items-center rounded-md border border-line bg-panel text-fgdim hover:text-cyan"
        >
          <Icon name="help" />
        </button>
        <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-md border border-cyan/40 bg-gradient-to-br from-cyan/20 to-purple/20 text-cyan">
          <Icon name="person" />
        </div>
      </div>
    </header>
  );
}
