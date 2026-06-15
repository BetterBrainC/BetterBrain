"use client";

import * as React from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatThaiDate } from "@/lib/date/buddhist";

/**
 * Buddhist-era date field. A native <input type="date"> renders the value in the
 * OS locale (Windows/en-US shows Gregorian MM/DD/YYYY), violating the locked
 * พ.ศ. rule. We stack a Thai-formatted label over a transparent native input:
 * the user sees "14 มิถุนายน 2569" but still gets the OS calendar picker. The
 * value contract stays "YYYY-MM-DD". Works controlled (value+onChange) or
 * uncontrolled (defaultValue + name, for FormData-serialized forms).
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

  function handle(next: string) {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  }

  const label = value ? formatThaiDate(value) : placeholder;

  return (
    <div
      className={cn(
        "relative flex h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 text-base focus-within:border-primary",
        disabled && "opacity-60",
        className,
      )}
    >
      <Calendar className="h-4 w-4 shrink-0 text-faint" aria-hidden />
      <span className={value ? "text-ink" : "text-muted"}>{label}</span>
      <input
        id={id}
        name={name}
        type="date"
        value={value}
        required={required}
        disabled={disabled}
        onChange={(e) => handle(e.target.value)}
        aria-label={value ? `วันที่ ${label}` : placeholder}
        className="absolute inset-0 w-full cursor-pointer rounded-md border-0 bg-transparent text-transparent caret-transparent outline-none [color-scheme:light] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
      />
    </div>
  );
}
