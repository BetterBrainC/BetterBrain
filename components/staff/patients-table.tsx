"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, Td } from "@/components/ui/table";
import { inputCls } from "@/components/ui/field";
import { DIAGNOSIS_LABEL, PATIENT_STATUS_LABEL } from "@/lib/i18n/th";
import type { PatientRow } from "@/lib/data/queries";

const STATUS_TONE = { active: "info", hold: "hold", no_service: "noservice" } as const;

/** Searchable ผู้รับบริการ table ("ค้นหา" by name / HN / diagnosis). */
export function PatientsTable({ patients }: { patients: PatientRow[] }) {
  const [q, setQ] = React.useState("");
  const term = q.trim().toLowerCase();
  const rows = term
    ? patients.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.hn ?? "").includes(term) ||
          (p.diagnosis ? DIAGNOSIS_LABEL[p.diagnosis].toLowerCase().includes(term) : false),
      )
    : patients;

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหา ชื่อ / Patient ID / การวินิจฉัย"
          className={`${inputCls} pl-9`}
        />
      </div>

      {/* Column order mirrors the Dashboard table (Patient ID first) — client 22 ก.ค. 2569. */}
      <DataTable headers={["Patient ID", "ชื่อ-สกุล", "การวินิจฉัย", "คอร์ส", "สถานะ"]}>
        {rows.map((p) => (
          <tr key={p.id} className="hover:bg-surface-tint">
            <Td className="tabular-nums text-muted">{p.hn ?? "—"}</Td>
            <Td>
              <Link href={`/staff/patients/${p.id}`} className="font-medium text-navy">
                {p.name}
              </Link>
              <div className="text-xs text-muted">
                {p.ageYears ? `${p.ageYears} ปี · ` : ""}{p.program ?? ""}
              </div>
            </Td>
            <Td>{p.diagnosis ? DIAGNOSIS_LABEL[p.diagnosis] : "—"}</Td>
            <Td className="tabular-nums">{p.courseUsed}/{p.courseTotal}</Td>
            <Td><Badge tone={STATUS_TONE[p.status]}>{PATIENT_STATUS_LABEL[p.status]}</Badge></Td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-6 text-center text-muted">
              {q.trim() ? `ไม่พบผู้รับบริการที่ตรงกับ “${q.trim()}”` : "ยังไม่มีผู้รับบริการ"}
            </td>
          </tr>
        )}
      </DataTable>
    </div>
  );
}
