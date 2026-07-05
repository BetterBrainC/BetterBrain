"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DataTable, Td } from "@/components/ui/table";
import { ThaiDate } from "@/components/ui/thai-date";
import type { ReportPatientRow } from "@/lib/data/queries";

const STATUS: Record<string, { label: string; tone: "completed" | "info" | "nocheckin" | "late" }> = {
  completed: { label: "จบเคส", tone: "completed" },
  draft: { label: "ร่าง", tone: "late" },
  corrected: { label: "แก้ไขแล้ว", tone: "info" },
  discarded: { label: "ยกเลิก", tone: "nocheckin" },
};

/** บันทึกรายงาน list — one row per recipient; the whole row opens their history. */
export function ReportPatientsTable({ patients }: { patients: ReportPatientRow[] }) {
  const router = useRouter();
  return (
    <DataTable headers={["Patient ID", "ชื่อ-สกุล", "จำนวนรายงาน", "ประเมิน", "ล่าสุด", "สถานะ"]}>
      {patients.map((p) => {
        const st = STATUS[p.lastStatus] ?? { label: p.lastStatus, tone: "info" as const };
        const href = `/staff/reports/patient/${p.patientId}`;
        const open = () => router.push(href);
        return (
          <tr
            key={p.patientId}
            onClick={open}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                open();
              }
            }}
            role="link"
            tabIndex={0}
            aria-label={`ดูสถิติการประเมินของ ${p.patientName}`}
            className="cursor-pointer hover:bg-surface-tint focus:bg-surface-tint focus:outline-none"
          >
            <Td className="tabular-nums text-muted">{p.patientHn ?? "—"}</Td>
            <Td className="font-medium text-primary-700 underline-offset-2 hover:underline">{p.patientName}</Td>
            <Td className="tabular-nums">{p.reportCount}</Td>
            <Td className="tabular-nums text-muted">{p.assessmentCount}</Td>
            <Td className="text-muted"><ThaiDate value={p.lastDate} /></Td>
            <Td><Badge tone={st.tone}>{st.label}</Badge></Td>
          </tr>
        );
      })}
    </DataTable>
  );
}
