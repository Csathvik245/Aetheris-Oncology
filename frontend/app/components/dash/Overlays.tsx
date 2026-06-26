"use client";

import { useEffect } from "react";
import { Modal, Icon } from "./Modal";

export interface LogEvent {
  id: number;
  time: string;
  agent: string;
  message: string;
  status: "running" | "done" | "error" | "info";
}

const STATUS_TONE: Record<LogEvent["status"], string> = {
  running: "text-cyan",
  done: "text-green",
  error: "text-red",
  info: "text-fgdim",
};

/* ---------- System Logs: right slide-over ---------- */
export function LogsPanel({
  events,
  onClose,
}: {
  events: LogEvent[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="overlay-in fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="sheet-in flex h-full w-[460px] flex-col border-l border-line bg-base2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-cyan/12 text-cyan ring-1 ring-cyan/30">
              <Icon name="terminal" />
            </span>
            <div>
              <h2 className="font-display text-[15px] font-semibold text-fg">System Logs</h2>
              <div className="label mt-0.5">{events.length} events · live pipeline trace</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md border border-line text-fgdim hover:text-cyan"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[12px]">
          {events.length === 0 ? (
            <div className="p-8 text-center text-fgmute">
              No activity yet. Start a new analysis to stream the pipeline trace here.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {events.map((e) => (
                <div key={e.id} className="flex gap-2 rounded px-2 py-1 hover:bg-panel">
                  <span className="shrink-0 text-fgmute">{e.time}</span>
                  <span className={`shrink-0 font-semibold ${STATUS_TONE[e.status]}`}>
                    {e.agent.toUpperCase()}
                  </span>
                  <span className="text-fgdim">{e.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Support ---------- */
export function SupportModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Support" subtitle="We're here to help" icon="help_outline" onClose={onClose}>
      <div className="flex flex-col gap-3">
        {[
          { icon: "mail", label: "Email", value: "support@aetheris.health" },
          { icon: "forum", label: "Live chat", value: "Mon–Fri · 9:00–18:00 UTC" },
          { icon: "menu_book", label: "Documentation", value: "docs.aetheris.health/orchestrator" },
          { icon: "bug_report", label: "Report an issue", value: "github.com/aetheris/orchestrator/issues" },
        ].map((r) => (
          <div key={r.label} className="flex items-center gap-3 rounded-lg border border-line bg-panel2 p-3">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-cyan/10 text-cyan">
              <Icon name={r.icon} size={16} />
            </span>
            <div>
              <div className="label">{r.label}</div>
              <div className="text-[13px] text-fg">{r.value}</div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ---------- Settings ---------- */
export function SettingsModal({
  api,
  online,
  onClose,
}: {
  api: string;
  online: boolean | null;
  onClose: () => void;
}) {
  const rows: [string, React.ReactNode][] = [
    ["Backend API", <span key="a" className="font-mono text-cyan">{api}</span>],
    [
      "Connection",
      <span key="c" className={online === false ? "text-red" : "text-green"}>
        {online === false ? "Offline" : "Online"}
      </span>,
    ],
    ["Theme", "Aetheris Dark (cyan)"],
    ["Build", "Orchestrator v1.0.0"],
    ["Embedding model", "dmis-lab/biobert-base-cased-v1.2"],
    ["Survival model", "pytorch-local"],
  ];
  return (
    <Modal title="Settings" subtitle="Workspace configuration" icon="settings" onClose={onClose}>
      <div className="divide-y divide-line">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between py-2.5">
            <span className="label">{k}</span>
            <span className="text-[13px] font-medium text-fg">{v}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ---------- Help ---------- */
export function HelpModal({ onClose }: { onClose: () => void }) {
  const steps = [
    ["upload_file", "Start an analysis", "Click “New Analysis” and select a tumor .vcf file."],
    ["hub", "Watch the orchestration", "The Core Nexus dispatches six agents; nodes light up as each runs."],
    ["monitoring", "Review the outcome", "Ranked treatment options appear at the bottom — click any card for full detail."],
    ["clinical_notes", "Explore trials & records", "Use the Trials and Patients tabs to browse matched studies and history."],
  ];
  return (
    <Modal title="Quick Start" subtitle="How the orchestrator works" icon="help" onClose={onClose}>
      <div className="flex flex-col gap-3">
        {steps.map(([icon, title, body], i) => (
          <div key={title} className="flex gap-3 rounded-lg border border-line bg-panel2 p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-cyan/10 text-cyan">
              <Icon name={icon} size={16} />
            </span>
            <div>
              <div className="text-[13px] font-semibold text-fg">
                {i + 1}. {title}
              </div>
              <div className="mt-0.5 text-[12px] leading-relaxed text-fgdim">{body}</div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ---------- Notifications ---------- */
export function NotificationsModal({
  events,
  onClose,
}: {
  events: LogEvent[];
  onClose: () => void;
}) {
  const notes = events.filter((e) => e.status === "done" || e.status === "error").slice(-8).reverse();
  return (
    <Modal title="Notifications" subtitle={`${notes.length} recent`} icon="notifications" onClose={onClose}>
      {notes.length === 0 ? (
        <div className="p-6 text-center text-fgmute">
          No notifications yet. Pipeline events will appear here.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((n) => (
            <div key={n.id} className="flex items-start gap-3 rounded-lg border border-line bg-panel2 p-3">
              <span
                className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md ${
                  n.status === "error" ? "bg-red/10 text-red" : "bg-green/10 text-green"
                }`}
              >
                <Icon name={n.status === "error" ? "error" : "check_circle"} size={15} />
              </span>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-fg">{n.agent.toUpperCase()}</div>
                <div className="truncate text-[12px] text-fgdim">{n.message}</div>
              </div>
              <span className="ml-auto shrink-0 text-[10px] text-fgmute">{n.time}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
