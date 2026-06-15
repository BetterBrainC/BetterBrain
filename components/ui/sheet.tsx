"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Accessible bottom-sheet / dialog (PWA bottom, desktop centered) with
 * enter/exit transitions, an explicit close button, and Esc-to-close.
 * Honors prefers-reduced-motion.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const [render, setRender] = React.useState(open);
  const [visible, setVisible] = React.useState(false);

  // Mount → animate in next frame; close → animate out, then unmount.
  React.useEffect(() => {
    if (open) {
      setRender(true);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = setTimeout(() => setRender(false), 200);
    return () => clearTimeout(t);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!render) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cn(
          "absolute inset-0 bg-[var(--overlay)] transition-opacity duration-200 motion-reduce:transition-none",
          visible ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-xl bg-surface p-5 shadow-pop transition-all duration-200 motion-reduce:transition-none sm:rounded-xl",
          visible
            ? "translate-y-0 opacity-100 sm:scale-100"
            : "translate-y-full opacity-0 sm:translate-y-2 sm:scale-95",
        )}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border sm:hidden" aria-hidden />
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-navy">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-tint"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
