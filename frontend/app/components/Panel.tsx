import React from "react";

/**
 * Stitch terminal panel: 1px gray border, surface-high header bar with
 * uppercase letter-spaced black label-caps, black body. Active modules use
 * the cyan border variant per the design system ("#00E5FF for active modules").
 */
export function Panel({
  title,
  right,
  active = false,
  className = "",
  bodyClassName = "",
  children,
}: {
  title: string;
  right?: React.ReactNode;
  active?: boolean;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col bg-black ${
        active ? "term-border-active" : "term-border"
      } ${className}`}
    >
      <header className="term-bg-header flex shrink-0 items-center justify-between border-b border-grid px-2 py-1">
        <span className="uplabel text-[10px] leading-3">{title}</span>
        {right !== undefined && (
          <span className="uplabel text-[10px] leading-3 opacity-80">
            {right}
          </span>
        )}
      </header>
      <div className={`min-h-0 flex-1 overflow-auto ${bodyClassName}`}>
        {children}
      </div>
    </section>
  );
}
