"use client";
import type { AgentCard } from "../lib/api";

/**
 * A2A agent registry — full-screen overlay for the judge demo, toggled from
 * the header. Solid black background + 2px cyan border per the design system
 * ("modals must punch through the data grid with a thick 2px cyan border").
 */
export function AgentCardsOverlay({
  cards,
  onClose,
}: {
  cards: AgentCard[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90 p-4">
      <div
        className="flex min-h-0 flex-1 flex-col bg-black"
        style={{ border: "2px solid #00e5ff" }}
      >
        <div className="term-bg-header flex shrink-0 items-center justify-between border-b border-grid px-2 py-1">
          <span className="uplabel text-[10px]">A2A AGENT REGISTRY</span>
          <button
            onClick={onClose}
            className="uplabel text-[10px] hover:underline"
          >
            [ CLOSE ] {cards.length} CARDS
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-px">
          {cards.length === 0 ? (
            <div className="p-3 text-[11px] text-gray">
              {
                "// GET /agents UNAVAILABLE — BACKEND OFFLINE OR NO CARDS REGISTERED."
              }
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-px bg-grid sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((c, i) => (
                <article key={i} className="flex flex-col gap-2 bg-black p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12px] font-700 text-cyan">
                      {c.name}
                    </span>
                    <span className="text-[9px] text-gray">v{c.version}</span>
                  </div>
                  <div className="text-[10px] text-onsurfacevar">
                    {c.description}
                  </div>
                  <div className="text-[9px] text-gray">
                    <span className="uplabel text-cyandim">ENDPOINT </span>
                    {c.endpoint}
                  </div>
                  <div>
                    <div className="uplabel text-[9px] text-cyandim">
                      CAPABILITIES
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(c.capabilities || []).map((cap, j) => (
                        <span
                          key={j}
                          className="border border-grid px-1 text-[9px] text-foreground"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="uplabel text-[9px] text-cyandim">
                      DATA SOURCES
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(c.data_sources || []).map((ds, j) => (
                        <span
                          key={j}
                          className="border border-grid px-1 text-[9px] text-amber"
                        >
                          {ds}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
