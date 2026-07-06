"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Back control that returns to the actual previous page (browser history) so a
 * detail page reached from different lists goes back where the user came from.
 * Falls back to a fixed href when there is no history (e.g. opened directly).
 */
export function BackButton({
  fallbackHref,
  label = "ย้อนกลับ",
}: {
  fallbackHref: string;
  label?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
      className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
    >
      <ArrowLeft className="h-4 w-4" /> {label}
    </button>
  );
}
