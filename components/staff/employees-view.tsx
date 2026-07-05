"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, Td } from "@/components/ui/table";
import { deleteEmployee } from "@/actions/employees";
import type { EmployeeLite } from "@/lib/data/queries";

const PROFESSION_LABEL: Record<string, string> = { ot: "นักกิจกรรมบำบัด (OT)", pt: "นักกายภาพบำบัด (PT)" };
const EMPLOYMENT_LABEL: Record<string, string> = { monthly: "Full-time", part_time: "Part-time" };

type EmploymentFilter = "all" | "monthly" | "part_time";
type ProfessionFilter = "all" | "ot" | "pt" | "none";

/** Gradient-initial avatar fallback when an employee has no photo. */
function Avatar({ name, src }: { name: string; src: string | null }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="h-9 w-9 rounded-full object-cover" />;
  }
  const initial = name.trim().charAt(0) || "?";
  return (
    <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-tint text-sm font-semibold text-primary-700">
      {initial}
    </span>
  );
}

export function EmployeesView({ employees }: { employees: EmployeeLite[] }) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<EmploymentFilter>("all");
  const [profFilter, setProfFilter] = React.useState<ProfessionFilter>("all");
  const [busyId, setBusyId] = React.useState<string | null>(null);

  // Headline cards = real workforce totals (always populated).
  const groups = [
    { label: "ทั้งหมด", n: employees.length },
    { label: "Full-time", n: employees.filter((e) => e.employment_type === "monthly").length },
    { label: "Part-time", n: employees.filter((e) => e.employment_type === "part_time").length },
    { label: "กำลังใช้งาน", n: employees.filter((e) => e.is_enabled).length },
  ];

  const shown = employees.filter(
    (e) =>
      (filter === "all" || e.employment_type === filter) &&
      (profFilter === "all" ||
        (profFilter === "none" ? e.profession !== "ot" && e.profession !== "pt" : e.profession === profFilter)),
  );

  async function remove(e: EmployeeLite) {
    if (!window.confirm(`ปิดใช้งานพนักงาน "${e.full_name}"? (เก็บประวัติเคสไว้)`)) return;
    setBusyId(e.id);
    const res = await deleteEmployee({ id: e.id });
    setBusyId(null);
    if (res.error) return window.alert(res.error);
    router.refresh();
  }

  const FILTERS: { key: EmploymentFilter; label: string }[] = [
    { key: "all", label: "ทั้งหมด" },
    { key: "monthly", label: "Full-time" },
    { key: "part_time", label: "Part-time" },
  ];
  const PROF_FILTERS: { key: ProfessionFilter; label: string }[] = [
    { key: "all", label: "ทุกตำแหน่ง" },
    { key: "ot", label: "นักกิจกรรมบำบัด (OT)" },
    { key: "pt", label: "นักกายภาพบำบัด (PT)" },
    { key: "none", label: "ไม่ระบุ" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {groups.map((g) => (
          <div key={g.label} className="rounded-lg border border-border bg-surface px-3 py-2.5">
            <p className="font-display text-xl font-bold tabular-nums text-navy">{g.n}</p>
            <p className="mt-0.5 text-2xs text-muted">{g.label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((ff) => (
          <button
            key={ff.key}
            type="button"
            onClick={() => setFilter(ff.key)}
            className={
              "rounded-pill border px-3 py-1.5 text-sm font-medium transition-colors " +
              (filter === ff.key
                ? "border-primary bg-surface-tint text-primary-700"
                : "border-border text-muted hover:bg-surface-tint")
            }
          >
            {ff.label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm text-muted">
          ตำแหน่ง
          <select
            value={profFilter}
            onChange={(e) => setProfFilter(e.target.value as ProfessionFilter)}
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-ink outline-none focus:border-primary"
          >
            {PROF_FILTERS.map((pf) => (
              <option key={pf.key} value={pf.key}>{pf.label}</option>
            ))}
          </select>
        </label>
      </div>

      <DataTable headers={["รหัสพนักงาน", "ชื่อ-สกุล", "ตำแหน่ง", "ใบอนุญาตเลขที่", "ประเภท", "สถานะ", ""]}>
        {shown.map((e) => (
          <tr key={e.id} className="hover:bg-surface-tint">
            <Td className="tabular-nums text-muted">{e.employee_code ?? "—"}</Td>
            <Td>
              <Link href={`/staff/employees/${e.id}`} className="flex items-center gap-2.5 font-medium text-navy">
                <Avatar name={e.full_name} src={e.photo_url} />
                {e.full_name}
              </Link>
            </Td>
            <Td>{e.profession ? PROFESSION_LABEL[e.profession] : (e.position_title ?? "—")}</Td>
            <Td className="text-muted">{e.license_no ?? "—"}</Td>
            <Td>{EMPLOYMENT_LABEL[e.employment_type]}</Td>
            <Td>
              <Badge tone={e.is_enabled ? "completed" : "nocheckin"}>
                {e.is_enabled ? "ใช้งาน" : "ปิด"}
              </Badge>
            </Td>
            <Td>
              {e.is_enabled && (
                <button
                  type="button"
                  onClick={() => remove(e)}
                  disabled={busyId === e.id}
                  aria-label={`ลบ ${e.full_name}`}
                  className="rounded-md p-1.5 text-muted hover:bg-[var(--danger-bg)] hover:text-[var(--danger-fg)] disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
