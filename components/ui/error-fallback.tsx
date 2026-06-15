"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shared body for `error.tsx` boundaries: friendly Thai message + manual retry.
 * Next.js already logs the error server-side; we avoid console (no-console rule).
 */
export function ErrorFallback({
  title = "เกิดข้อผิดพลาด",
  error,
  reset,
}: {
  title?: string;
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-[var(--gutter-page)] py-10">
      <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <div
          className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full"
          style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
        >
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="font-display text-lg font-bold text-navy">{title}</h2>
        <p className="mt-1.5 text-sm text-muted">
          ลองกดโหลดใหม่ — ถ้ายังไม่หาย แจ้งทีมพัฒนาพร้อมรหัสด้านล่าง
        </p>
        {error.digest && (
          <p className="mt-3 inline-block rounded-full bg-surface-sunken px-3 py-1 font-mono text-2xs text-faint">
            digest: {error.digest}
          </p>
        )}
        <div className="mt-5 flex justify-center">
          <Button onClick={reset}>
            <RotateCcw className="h-4 w-4" /> โหลดใหม่
          </Button>
        </div>
      </div>
    </div>
  );
}
