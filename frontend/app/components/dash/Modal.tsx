"use client";

import { useEffect } from "react";

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size }}>
      {name}
    </span>
  );
}

export function Modal({
  title,
  subtitle,
  icon,
  onClose,
  children,
  width = "max-w-lg",
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="overlay-in fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`sheet-in card card-cyan flex max-h-[85vh] w-full ${width} flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-line bg-base2/60 p-4">
          <div className="flex items-center gap-3">
            {icon && (
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-cyan/12 text-cyan ring-1 ring-cyan/30">
                <Icon name={icon} />
              </span>
            )}
            <div>
              <h2 className="font-display text-[15px] font-semibold text-fg">{title}</h2>
              {subtitle && <div className="label mt-0.5">{subtitle}</div>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md border border-line text-fgdim hover:text-cyan"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}
