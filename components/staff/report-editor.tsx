"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateReportPayload } from "@/actions/reports";

/** One editable leaf of the report payload, addressed by its dot-path. */
interface Leaf {
  path: string;
  label: string;
  value: string;
  kind: "text" | "long" | "number" | "boolean";
}

/**
 * Flatten a report payload into editable leaves. Objects and arrays recurse so
 * nested clinical sections (vitals, checklists) stay reachable; the dot-path is
 * what the server writes back through.
 */
function toLeaves(value: unknown, path: string[] = [], label = ""): Leaf[] {
  if (value === null || value === undefined) {
    return path.length ? [{ path: path.join("."), label, value: "", kind: "text" }] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => toLeaves(v, [...path, String(i)], `${label} [${i + 1}]`));
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      toLeaves(v, [...path, k], label ? `${label} · ${k}` : k),
    );
  }
  if (typeof value === "boolean") {
    return [{ path: path.join("."), label, value: String(value), kind: "boolean" }];
  }
  if (typeof value === "number") {
    return [{ path: path.join("."), label, value: String(value), kind: "number" }];
  }
  const text = String(value);
  return [{ path: path.join("."), label, value: text, kind: text.length > 60 ? "long" : "text" }];
}

/**
 * Director/Admin correction of a filed report (client 3 ส.ค. 2569). Read-only
 * until "แก้ไข" is pressed, and only changed fields are sent, so an untouched
 * report is never rewritten.
 */
export function ReportEditor({ reportId, payload }: { reportId: string; payload: Record<string, unknown> }) {
  const router = useRouter();
  const initial = React.useMemo(() => toLeaves(payload), [payload]);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok?: boolean; error?: string } | null>(null);

  if (initial.length === 0) return null;

  function start() {
    setDraft(Object.fromEntries(initial.map((l) => [l.path, l.value])));
    setMsg(null);
    setEditing(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const changed = Object.fromEntries(
      initial.filter((l) => draft[l.path] !== undefined && draft[l.path] !== l.value).map((l) => [l.path, draft[l.path]!]),
    );
    if (Object.keys(changed).length === 0) {
      setEditing(false);
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await updateReportPayload({ reportId, values: changed });
      setMsg(res);
      if (res.ok) {
        setEditing(false);
        router.refresh();
      }
    } catch {
      setMsg({ error: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" });
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <Button size="sm" variant="secondary" onClick={start}>
          <PencilLine className="h-4 w-4" /> แก้ไขรายงาน
        </Button>
        {msg?.ok && <span className="text-sm text-teal">บันทึกแล้ว</span>}
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {initial.map((l) => (
          <label key={l.path} className={"flex flex-col gap-1 " + (l.kind === "long" ? "sm:col-span-2" : "")}>
            <span className="text-xs text-muted">{l.label}</span>
            {l.kind === "boolean" ? (
              <select
                value={draft[l.path] ?? l.value}
                onChange={(e) => setDraft((d) => ({ ...d, [l.path]: e.target.value }))}
                className="h-10 rounded-md border border-border bg-surface px-2 text-sm text-ink focus:border-primary"
              >
                <option value="true">ใช่</option>
                <option value="false">ไม่</option>
              </select>
            ) : l.kind === "long" ? (
              <textarea
                rows={3}
                value={draft[l.path] ?? l.value}
                onChange={(e) => setDraft((d) => ({ ...d, [l.path]: e.target.value }))}
                className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-ink focus:border-primary"
              />
            ) : (
              <input
                type={l.kind === "number" ? "number" : "text"}
                value={draft[l.path] ?? l.value}
                onChange={(e) => setDraft((d) => ({ ...d, [l.path]: e.target.value }))}
                className="h-10 rounded-md border border-border bg-surface px-2 text-sm text-ink focus:border-primary"
              />
            )}
          </label>
        ))}
      </div>
      {msg?.error && <p className="text-sm text-[var(--danger-fg)]">{msg.error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={busy}>
          ยกเลิก
        </Button>
        <Button type="submit" disabled={busy}>{busy ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}</Button>
      </div>
    </form>
  );
}
