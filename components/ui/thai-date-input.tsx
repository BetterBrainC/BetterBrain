"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatThaiDate } from "@/lib/date/buddhist";

/**
 * Buddhist-era date field with a CUSTOM calendar picker (not the native OS
 * picker). The native <input type="date"> was rejected by the client: on
 * Android the OS calendar pages month-by-month with no discoverable year
 * selection (unusable for birthdates) and its confirm button label ("ตั้งค่า")
 * cannot be changed. This picker gives month + พ.ศ.-year dropdowns, a day
 * grid, and ล้าง / ยกเลิก / เรียบร้อย actions — identical on mobile + desktop.
 * The value contract stays "YYYY-MM-DD" (Gregorian; พ.ศ. is display-only).
 * Works controlled (value+onChange) or uncontrolled (defaultValue + name).
 */
export interface ThaiDateInputProps {
  value?: string;
  defaultValue?: string;
  onChange?: (next: string) => void;
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const THAI_WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const ROLE_THEMES = ["theme-employee", "theme-admin", "theme-director"];

type Ymd = { y: number; m: number; d: number };

function parseYmd(v: string): Ymd | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? { y: +m[1]!, m: +m[2]! - 1, d: +m[3]! } : null;
}
function toYmd({ y, m, d }: Ymd): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function ThaiDateInput({
  value: controlled,
  defaultValue = "",
  onChange,
  name,
  id,
  required,
  disabled,
  placeholder = "เลือกวันที่",
  className,
}: ThaiDateInputProps) {
  const isControlled = controlled !== undefined;
  const [internal, setInternal] = React.useState(defaultValue);
  const value = isControlled ? controlled : internal;

  const rootRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Ymd | null>(null);
  const [view, setView] = React.useState<{ y: number; m: number }>({ y: 0, m: 0 });
  // The picker portals to <body>, escaping the role-theme wrapper — carry the
  // ancestor theme class over so ปุ่ม/วันที่เลือก keep the zone's primary color.
  const [themeClass, setThemeClass] = React.useState("");

  function commit(next: string) {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  }

  function openPicker() {
    if (disabled) return;
    const sel = parseYmd(value || "");
    const today = new Date();
    setDraft(sel);
    setView(sel ? { y: sel.y, m: sel.m } : { y: today.getFullYear(), m: today.getMonth() });
    const host = ROLE_THEMES.map((t) => rootRef.current?.closest(`.${t}`) && t).find(Boolean);
    setThemeClass(host || "");
    setOpen(true);
  }

  // Close on Esc — capture + stopPropagation so an enclosing <Sheet>'s own
  // document-level Esc handler doesn't also fire and close the whole sheet.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open]);

  const label = value ? formatThaiDate(value) : placeholder;

  // Year list: 110 years back (elderly birthdates) → 3 forward (appointments).
  const nowY = new Date().getFullYear();
  const years: number[] = [];
  for (let y = nowY + 3; y >= nowY - 110; y--) years.push(y);

  const firstDow = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const today = new Date();
  const isToday = (d: number) =>
    view.y === today.getFullYear() && view.m === today.getMonth() && d === today.getDate();
  const isDraft = (d: number) => !!draft && draft.y === view.y && draft.m === view.m && draft.d === d;

  function step(delta: number) {
    setView(({ y, m }) => {
      const next = new Date(y, m + delta, 1);
      return { y: next.getFullYear(), m: next.getMonth() };
    });
  }

  const picker = open
    ? createPortal(
        <div
          className={cn("fixed inset-0 z-toast flex items-center justify-center p-4", themeClass)}
          role="dialog"
          aria-modal="true"
          aria-label={placeholder}
        >
          <div className="absolute inset-0 bg-[var(--overlay)]" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative w-full max-w-sm rounded-lg bg-surface p-4 shadow-pop">
            <div className="mb-3 flex items-center gap-1">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="เดือนก่อนหน้า"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-tint"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <select
                value={view.m}
                onChange={(e) => setView((v) => ({ ...v, m: +e.target.value }))}
                aria-label="เดือน"
                className="h-10 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 text-base text-ink focus:border-primary"
              >
                {THAI_MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={view.y}
                onChange={(e) => setView((v) => ({ ...v, y: +e.target.value }))}
                aria-label="ปี พ.ศ."
                className="h-10 w-24 rounded-md border border-border bg-surface px-2 text-base text-ink focus:border-primary"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y + 543}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="เดือนถัดไป"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-tint"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 text-center">
              {THAI_WEEKDAYS.map((w) => (
                <div key={w} className="py-1 text-xs font-semibold text-faint">{w}</div>
              ))}
              {Array.from({ length: firstDow }, (_, i) => (
                <div key={`blank-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                <div key={d} className="grid place-items-center py-0.5">
                  <button
                    type="button"
                    onClick={() => setDraft({ y: view.y, m: view.m, d })}
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-pill text-sm tabular-nums transition-colors",
                      isDraft(d)
                        ? "bg-primary font-semibold text-primary-fg"
                        : isToday(d)
                          ? "border border-primary font-semibold text-primary-700"
                          : "text-ink hover:bg-surface-tint",
                    )}
                  >
                    {d}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => { commit(""); setOpen(false); }}
                className="h-10 rounded-md px-3 text-sm font-semibold text-muted hover:bg-surface-tint"
              >
                ล้าง
              </button>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-10 rounded-md px-3 text-sm font-semibold text-muted hover:bg-surface-tint"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={!draft}
                  onClick={() => { if (draft) { commit(toYmd(draft)); setOpen(false); } }}
                  className="h-10 rounded-pill bg-primary px-5 text-sm font-semibold text-primary-fg shadow-primary hover:bg-primary-600 disabled:pointer-events-none disabled:opacity-50"
                >
                  เรียบร้อย
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative flex h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 text-base focus-within:border-primary",
        disabled && "opacity-60",
        className,
      )}
    >
      <Calendar className="h-4 w-4 shrink-0 text-faint" aria-hidden />
      <span className={value ? "text-ink" : "text-muted"}>{label}</span>
      {/* readOnly text input keeps FormData serialization + `required` browser
          validation + a focusable target, without ever summoning the OS picker
          or the mobile keyboard. */}
      <input
        id={id}
        name={name}
        type="text"
        readOnly
        inputMode="none"
        value={value}
        required={required}
        disabled={disabled}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        aria-label={value ? `วันที่ ${label}` : placeholder}
        aria-haspopup="dialog"
        className="absolute inset-0 w-full cursor-pointer rounded-md border-0 bg-transparent text-transparent caret-transparent outline-none"
      />
      {picker}
    </div>
  );
}
