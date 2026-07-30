"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Time field wrapping a native <input type="time">. Value contract "HH:MM";
 * works controlled or uncontrolled (name + defaultValue).
 *
 * The input text used to be transparent with a formatted label painted over it,
 * but a time input only fires onChange once BOTH segments are valid — so while
 * typing (or stepping with the arrow keys) the field looked frozen and staff
 * reported "แก้ไขเวลาไม่ได้" (client 30 ก.ค. 2569). The native segments are now
 * visible, so every keystroke gives feedback.
 */
export interface Time24InputProps {
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

export function Time24Input({
  value: controlled,
  defaultValue = "",
  onChange,
  name,
  id,
  required,
  disabled,
  placeholder = "--:--",
  className,
}: Time24InputProps) {
  const isControlled = controlled !== undefined;
  const [internal, setInternal] = React.useState(defaultValue);
  const v = isControlled ? controlled : internal;

  function handle(next: string) {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  }

  return (
    <div
      className={cn(
        "relative flex h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 text-base focus-within:border-primary",
        disabled && "opacity-60",
        className,
      )}
    >
      <Clock className="h-4 w-4 shrink-0 text-faint" aria-hidden />
      <input
        id={id}
        name={name}
        type="time"
        step={60}
        value={v}
        required={required}
        disabled={disabled}
        onChange={(e) => handle(e.target.value)}
        aria-label="เวลา"
        placeholder={placeholder}
        className="w-full min-w-0 flex-1 cursor-text border-0 bg-transparent p-0 text-base tabular-nums text-ink outline-none [color-scheme:light] [&::-webkit-calendar-picker-indicator]:cursor-pointer"
      />
      {v && <span className="shrink-0 text-sm text-muted">น.</span>}
    </div>
  );
}
