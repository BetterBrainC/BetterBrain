"use client";

import { Laugh, Smile, Meh, Frown, Angry, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 5-face mood scale for the employee "เช็คสุขภาพใจ" check (client Final brief
 * #24/#27): no text questions — pick a face. Stored as a 0–4 index in
 * kpi_evaluations.answers.mood; shown read-only in the Director results.
 */
export const MOODS: { value: number; label: string; Icon: LucideIcon; color: string }[] = [
  { value: 0, label: "ดีมาก", Icon: Laugh, color: "var(--status-completed-fg)" },
  { value: 1, label: "ดี", Icon: Smile, color: "var(--teal-600)" },
  { value: 2, label: "เฉย ๆ", Icon: Meh, color: "var(--status-late-fg)" },
  { value: 3, label: "ไม่ค่อยดี", Icon: Frown, color: "var(--accent-700)" },
  { value: 4, label: "แย่", Icon: Angry, color: "var(--status-nocheckin-fg)" },
];

/** Interactive face picker (employee self-check). */
export function MoodPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex justify-between gap-2" role="radiogroup" aria-label="วันนี้คุณรู้สึกอย่างไร?">
      {MOODS.map((m) => {
        const active = value === m.value;
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={m.label}
            onClick={() => onChange(m.value)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-lg border p-2 transition",
              active ? "border-current bg-surface-tint" : "border-border hover:bg-surface-tint",
            )}
            style={active ? { color: m.color } : undefined}
          >
            <m.Icon className="h-7 w-7" style={{ color: m.color }} aria-hidden />
            <span className={cn("text-2xs", active ? "font-semibold" : "text-muted")}>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Read-only single face (Director results). */
export function MoodFace({ value, showLabel = true }: { value: number; showLabel?: boolean }) {
  const m = MOODS.find((x) => x.value === value);
  if (!m) return <span className="text-muted">—</span>;
  return (
    <span className="inline-flex items-center gap-1" title={m.label}>
      <m.Icon className="h-5 w-5" style={{ color: m.color }} aria-hidden />
      {showLabel && <span className="text-xs" style={{ color: m.color }}>{m.label}</span>}
    </span>
  );
}
