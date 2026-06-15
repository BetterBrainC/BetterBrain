import * as React from "react";
import { cn } from "@/lib/utils";

export const inputCls =
  "h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-ink outline-none focus:border-primary disabled:opacity-60";

/** Larger 48px-tall input for standalone auth forms (touch-target ≥48px). */
export const inputClsLg =
  "h-12 w-full rounded-md border border-border bg-surface px-3 text-base text-ink outline-none focus:border-primary disabled:opacity-60";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return <input {...props} className={cn(inputCls, props.className)} />;
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea {...props} className={cn(inputCls, "h-20 py-2", props.className)} />
  );
}

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
  return <select {...props} className={cn(inputCls, props.className)} />;
}
