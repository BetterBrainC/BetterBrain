"use client";

import { ErrorFallback } from "@/components/ui/error-fallback";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="th">
      <body>
        <ErrorFallback title="ระบบขัดข้อง" error={error} reset={reset} />
      </body>
    </html>
  );
}
