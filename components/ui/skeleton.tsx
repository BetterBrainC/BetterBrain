import { cn } from "@/lib/utils";

/** Loading-skeleton primitives — match surface tokens so loading.tsx reads like
 *  the real page rather than a generic spinner. */
export function SkeletonBlock({
  className,
  height = "auto",
}: {
  className?: string;
  height?: string;
}) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface-sunken", className)}
      style={{ height }}
      aria-hidden
    />
  );
}

export function SkeletonHeader() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <SkeletonBlock className="w-32" height="11px" />
      <SkeletonBlock className="mt-2 w-56" height="22px" />
      <SkeletonBlock className="mt-2 w-72" height="13px" />
    </div>
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <SkeletonBlock className="h-11 w-11 shrink-0" />
        <div className="flex-1 space-y-2">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonBlock
              key={i}
              className={i === 0 ? "w-1/2" : i === 1 ? "w-3/4" : "w-2/3"}
              height="12px"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <ul className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <SkeletonCard />
        </li>
      ))}
    </ul>
  );
}
