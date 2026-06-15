import * as React from "react";
import { cn } from "@/lib/utils";

/** Base surface card — rounded-2xl, soft navy-tinted shadow. */
export function Card({
  className,
  tinted = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tinted?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border p-[var(--card-pad)] shadow-sm",
        tinted ? "bg-surface-tint" : "bg-surface",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold text-navy", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted", className)} {...props} />;
}
