import * as React from "react";
import { cn } from "@/lib/utils";

/** Lightweight staff data table (sticky header, zebra, hover). */
export function DataTable({
  headers,
  children,
  className,
}: {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto rounded-lg border border-border bg-surface", className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-surface-sunken text-left text-xs text-muted">
            {headers.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-t [&>tr]:border-border">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}
