import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatThaiDateTime } from "@/lib/date/buddhist";
import { SESSION_STATUS_LABEL } from "@/lib/i18n/th";
import { writeAudit } from "@/lib/audit/log";

function csvCell(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

type Status = keyof typeof SESSION_STATUS_LABEL;
type Row = {
  scheduled_date: string;
  status: Status;
  patients: { full_name: string | null } | null;
  employee: { full_name: string | null } | null;
  check_ins: { kind: string; client_event_at: string; within_geofence: boolean | null; is_late: boolean; distance_m: number | null }[] | null;
};

/** Date-range attendance export (CSV, UTF-8 BOM). Staff only. */
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
    .select("scheduled_date, status, patients(full_name), employee:profiles!schedule_sessions_employee_id_fkey(full_name), check_ins(kind, client_event_at, within_geofence, is_late, distance_m)")
    .order("scheduled_date");
  if (from) q = q.gte("scheduled_date", from);
  if (to) q = q.lte("scheduled_date", to);
  const { data } = await q;
  const rows = (Array.isArray(data) ? data : []) as unknown as Row[];

  const headers = ["วันที่", "ผู้รับบริการ", "พนักงาน", "สถานะ", "เช็คอิน", "เช็คเอาท์", "ชั่วโมง", "สาย", "ระยะ(ม.)", "ในระยะ"];
  const lines = rows.map((r) => {
    const ci = r.check_ins?.find((c) => c.kind === "check_in");
    const co = r.check_ins?.find((c) => c.kind === "check_out");
    const hours =
      ci && co ? Math.round((new Date(co.client_event_at).getTime() - new Date(ci.client_event_at).getTime()) / 360_000) / 10 : "";
    return [
      r.scheduled_date,
      r.patients?.full_name ?? "",
      r.employee?.full_name ?? "",
      SESSION_STATUS_LABEL[r.status] ?? r.status,
      ci ? formatThaiDateTime(ci.client_event_at) : "",
      co ? formatThaiDateTime(co.client_event_at) : "",
      hours === "" ? "" : hours > 0 ? hours : "",
      ci?.is_late ? "สาย" : "",
      ci?.distance_m != null ? Math.round(ci.distance_m) : "",
      ci?.within_geofence == null ? "" : ci.within_geofence ? "ใช่" : "ไม่",
    ].map(csvCell).join(",");
  });
  const csv = "﻿" + [headers.map(csvCell).join(","), ...lines].join("\r\n");

  await writeAudit({
    action: "export",
    entity: "attendance",
    actorId: user.id,
    actorRole: (role ?? null) as never,
    context: { kind, from: from || null, to: to || null, rows: rows.length },
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8;",
      "Content-Disposition": `attachment; filename="attendance-${from || "all"}_${to || "all"}.csv"`,
    },
  });
}
