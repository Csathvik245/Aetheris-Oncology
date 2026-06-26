"use client";
import { useEffect, useRef } from "react";

export interface LogLine {
  id: number;
  time: string;
  agent: string;
  message: string;
  kind: "start" | "complete" | "error" | "info";
}

export function AgentLog({ lines }: { lines: LogLine[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines]);

  // Stitch: cyan START / green COMPLETE / red ERROR / gray info(SYS)
  const color = (k: LogLine["kind"]) =>
    k === "start"
      ? "text-cyan"
      : k === "complete"
        ? "text-term-green"
        : k === "error"
          ? "text-red"
          : "text-cyan";

  return (
    <div className="log-container flex h-full flex-col gap-1 overflow-y-auto p-2 text-[11px] leading-[14px] text-onsurfacevar">
      {lines.length === 0 && (
        <div className="flex gap-2">
          <span className="text-gray">[--:--:--]</span>
          <span className="text-cyan">SYS</span>
          <span>
            &gt; AWAITING WORKFLOW... LOAD A .VCF TO BEGIN
            <span className="blink"> ▋</span>
          </span>
        </div>
      )}
      {lines.map((l) => (
        <div key={l.id} className="flex gap-2 whitespace-pre-wrap break-words">
          <span className="shrink-0 text-gray">[{l.time}]</span>
          <span className={`shrink-0 font-600 ${color(l.kind)}`}>{l.agent}</span>
          <span className={l.kind === "error" ? "text-red" : ""}>
            &gt; {l.message}
          </span>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
