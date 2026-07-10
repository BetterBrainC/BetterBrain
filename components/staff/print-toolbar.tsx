"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Toolbar for the letterhead print view — hidden on paper. Auto-opens the
 * browser's print dialog once so "Export" lands straight on บันทึกเป็น PDF.
 */
export function PrintToolbar() {
  React.useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="mx-auto flex max-w-[210mm] items-center justify-between gap-3 px-6 py-3 print:hidden">
      <p className="text-sm text-muted">เลือกปลายทาง “Save as PDF / บันทึกเป็น PDF” ในหน้าต่างพิมพ์</p>
      <Button size="sm" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> พิมพ์ / บันทึกเป็น PDF
      </Button>
    </div>
  );
}
