import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { formatThaiDateTime } from "@/lib/date/buddhist";
import { SESSION_STATUS_LABEL } from "@/lib/i18n/th";
import { writeAudit } from "@/lib/audit/log";

export const runtime = "nodejs";

type Status = keyof typeof SESSION_STATUS_LABEL;
type Row = {
  scheduled_date: string;
  status: Status;
  patients: { full_name: string | null } | null;
  employee: { full_name: string | null } | null;
  check_ins: { kind: string; client_event_at: string; within_geofence: boolean | null; is_late: boolean; is_early: boolean; distance_m: number | null }[] | null;
};

/** Date-range attendance export as a real .xlsx workbook (SheetJS-style). Staff only. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  if (kind !== "attendance") return new Response("ไม่รองรับ", { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (me as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "director") return new Response("forbidden", { status: 403 });

  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";

  let q = supabase
    .from("schedule_sessions")
    .select("scheduled_date, status, patients(full_name), employee:profiles!schedule_sessions_employee_id_fkey(full_name), check_ins(kind, client_event_at, within_geofence, is_late, is_early, distance_m)")
    .order("scheduled_date");
  if (from) q = q.gte("scheduled_date", from);
  if (to) q = q.lte("scheduled_date", to);
  const { data } = await q;
  const rows = (Array.isArray(data) ? data : []) as unknown as Row[];

  const wb = new ExcelJS.Workbook();
  wb.creator = "TPM";
  const ws = wb.addWorksheet("Attendance");
  ws.columns = [
    { header: "วันที่", key: "date", width: 14 },
    { header: "ผู้รับบริการ", key: "patient", width: 22 },
    { header: "พนักงาน", key: "emp", width: 22 },
    { header: "สถานะ", key: "status", width: 14 },
    { header: "เช็คอิน", key: "in", width: 22 },
    { header: "เช็คเอาท์", key: "out", width: 22 },
    { header: "ชั่วโมง", key: "hours", width: 9 },
    { header: "สาย", key: "late", width: 7 },
    { header: "ออกก่อนเวลา", key: "early", width: 12 },
    { header: "ระยะ(ม.)", key: "dist", width: 10 },
    { header: "ในระยะ", key: "within", width: 9 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const r of rows) {
    const ci = r.check_ins?.find((c) => c.kind === "check_in");
    const co = r.check_ins?.find((c) => c.kind === "check_out");
    const hours = ci && co ? Math.round((new Date(co.client_event_at).getTime() - new Date(ci.client_event_at).getTime()) / 360_000) / 10 : null;
    ws.addRow({
      date: r.scheduled_date,
      patient: r.patients?.full_name ?? "",
      emp: r.employee?.full_name ?? "",
      status: SESSION_STATUS_LABEL[r.status] ?? r.status,
      in: ci ? formatThaiDateTime(ci.client_event_at) : "",
      out: co ? formatThaiDateTime(co.client_event_at) : "",
      hours: hours != null && hours > 0 ? hours : "",
      late: ci?.is_late ? "สาย" : "",
      early: co?.is_early ? "ออกก่อนเวลา" : "",
      dist: ci?.distance_m != null ? Math.round(ci.distance_m) : "",
      within: ci?.within_geofence == null ? "" : ci.within_geofence ? "ใช่" : "ไม่",
    });
  }

  const buf = await wb.xlsx.writeBuffer();

  await writeAudit({
    action: "export",
    entity: "attendance",
    actorId: user.id,
    actorRole: (role ?? null) as never,
    context: { kind, from: from || null, to: to || null, rows: rows.length, format: "xlsx" },
  });

  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="attendance-${from || "all"}_${to || "all"}.xlsx"`,
    },
  });
}
