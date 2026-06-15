"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Client-side CSV export (UTF-8 BOM so Thai opens correctly in Excel). */
export function ExportButton({
  filename,
  headers,
  rows,
  label = "Export Excel/CSV",
}: {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
  label?: string;
}) {
  function download() {
    const matrix = [headers, ...rows];
    const csv = matrix.map((cols) => cols.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="secondary" onClick={download} disabled={rows.length === 0}>
      <Download className="h-4 w-4" /> {label}
    </Button>
  );
}
