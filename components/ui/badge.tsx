import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Status badge — a pill with a leading dot, ALWAYS paired with a Thai word
 * (never color-only, per WCAG 2.2). `tone` maps to the design-system status
 * triplets in globals.css.
 */
type Tone =
  | "late"
  | "nocheckin"
  | "skipped"
  | "early"
  | "completed"
  | "hold"
  | "noservice"
  | "info"
  | "neutral";

const TONE_VARS: Record<Tone, { fg: string; bg: string; dot: string }> = {
  late: { fg: "--status-late-fg", bg: "--status-late-bg", dot: "--status-late-solid" },
  nocheckin: { fg: "--status-nocheckin-fg", bg: "--status-nocheckin-bg", dot: "--status-nocheckin-solid" },
  skipped: { fg: "--status-skipped-fg", bg: "--status-skipped-bg", dot: "--status-skipped-solid" },
  early: { fg: "--status-early-fg", bg: "--status-early-bg", dot: "--status-early-solid" },
  completed: { fg: "--status-completed-fg", bg: "--status-completed-bg", dot: "--status-completed-solid" },
  hold: { fg: "--status-hold-fg", bg: "--status-hold-bg", dot: "--status-hold-solid" },
  noservice: { fg: "--status-noservice-fg", bg: "--status-noservice-bg", dot: "--status-noservice-solid" },
  info: { fg: "--info-fg", bg: "--info-bg", dot: "--info-fg" },
  neutral: { fg: "--text-muted", bg: "--surface-sunken", dot: "--text-faint" },
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  const v = TONE_VARS[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-medium",
        className,
      )}
      style={{ color: `var(${v.fg})`, backgroundColor: `var(${v.bg})` }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: `var(${v.dot})` }}
      />
      {children}
    </span>
  );
}
