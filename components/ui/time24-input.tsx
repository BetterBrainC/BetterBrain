"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 24-hour time field. A native <input type="time"> can render 12h (AM/PM) on
 * some OS locales; we overlay a 24h label over a transparent native input. Value
 * contract stays "HH:MM". Works controlled or uncontrolled (name + defaultValue).
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
      <span className={v ? "tabular-nums text-ink" : "text-muted"}>{v ? `${v} น.` : placeholder}</span>
      <input
        id={id}
        name={name}
        type="time"
        value={v}
        required={required}
        disabled={disabled}
        onChange={(e) => handle(e.target.value)}
        aria-label="เวลา (24 ชม.)"
        className="absolute inset-0 w-full cursor-pointer rounded-md border-0 bg-transparent text-transparent caret-transparent outline-none [color-scheme:light] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
      />
    </div>
  );
}
