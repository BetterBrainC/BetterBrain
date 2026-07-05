"use client";

import * as React from "react";
import { Share2, Copy, Check } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { createRelativeShareLink, setRelativeReportVisibility } from "@/actions/portal";
import type { RelativeManagePatient } from "@/lib/data/queries";

/**
 * Pick a recipient → copy their relatives-portal link + choose which reports the
 * relatives portal shows (moved here from the patient detail page).
 */
export function RelativeAccessManager({ patients }: { patients: RelativeManagePatient[] }) {
  const [id, setId] = React.useState("");
  const selected = patients.find((p) => p.id === id) ?? null;

  const [link, setLink] = React.useState<string | null>(null);
  const [hasLink, setHasLink] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [showFollowup, setShowFollowup] = React.useState(true);
  const [showSummary, setShowSummary] = React.useState(true);
  const [visBusy, setVisBusy] = React.useState(false);
  const [visMsg, setVisMsg] = React.useState<{ ok?: boolean; error?: string } | null>(null);

  React.useEffect(() => {
    setErr(null);
    setCopied(false);
    setVisMsg(null);
    if (!selected) {
      setLink(null);
      setHasLink(false);
      return;
    }
    setShowFollowup(selected.showFollowup);
    setShowSummary(selected.showSummary);
    setHasLink(selected.hasLink);
    const base = typeof window !== "undefined" ? window.location.origin : "";
    setLink(selected.token ? `${base}/r/${selected.token}` : null);
  }, [selected]);

  async function makeOrCopyLink() {
    if (!selected) return;
    setBusy(true);
    setErr(null);
    setCopied(false);
    let url = link;
    if (!url) {
      const res = await createRelativeShareLink(selected.id);
      if (res.error || !res.token) {
        setBusy(false);
        return setErr(res.error ?? "สร้างลิงก์ไม่สำเร็จ");
      }
      const base = typeof window !== "undefined" ? window.location.origin : "";
      url = `${base}/r/${res.token}`;
      setLink(url);
      setHasLink(true);
    }
    setBusy(false);
    if (url && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    }
  }

  async function saveVisibility(next: { followup: boolean; summary: boolean }) {
    if (!selected) return;
    setShowFollowup(next.followup);
    setShowSummary(next.summary);
    setVisBusy(true);
    setVisMsg(null);
    const res = await setRelativeReportVisibility({
      patientId: selected.id,
      showFollowup: next.followup,
      showSummary: next.summary,
    });
    setVisBusy(false);
    setVisMsg(res);
  }

  return (
    <Card className="space-y-4">
      <CardTitle className="text-base">ลิงก์ญาติ &amp; รายงานที่ให้ญาติเห็น</CardTitle>
      <Field label="เลือกผู้รับบริการ">
        <Select value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">— เลือกผู้รับบริการ —</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}{p.hn ? ` (${p.hn})` : ""}
            </option>
          ))}
        </Select>
      </Field>

      {selected && (
        <>
          <div>
            <Button size="sm" variant="secondary" onClick={makeOrCopyLink} disabled={busy}>
              {copied ? <Check className="h-4 w-4 text-teal" /> : link ? <Copy className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              {busy ? "กำลังสร้าง…" : copied ? "คัดลอกแล้ว" : link ? "คัดลอกลิงก์ญาติ" : "สร้างลิงก์ญาติ"}
            </Button>
          </div>
          {err && <p className="text-sm text-[var(--danger-fg)]">{err}</p>}
          {link && (
            <code className="block truncate rounded bg-surface-tint px-2 py-1.5 text-xs text-primary-700">{link}</code>
          )}

          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-sm font-medium text-ink">รายงานที่ให้ญาติเห็น</p>
            {!hasLink && <p className="text-xs text-muted">สร้างลิงก์ญาติก่อน แล้วจึงเลือกได้ว่าจะให้เห็นรายงานใด</p>}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--primary)]"
                  checked={showFollowup}
                  disabled={!hasLink || visBusy}
                  onChange={(e) => saveVisibility({ followup: e.target.checked, summary: showSummary })}
                />
                บันทึกรายวัน (Follow up)
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--primary)]"
                  checked={showSummary}
                  disabled={!hasLink || visBusy}
                  onChange={(e) => saveVisibility({ followup: showFollowup, summary: e.target.checked })}
                />
                ความก้าวหน้ารายเดือน (Summary)
              </label>
            </div>
            {visMsg?.error && <p className="text-sm text-[var(--danger-fg)]">{visMsg.error}</p>}
            {visMsg?.ok && <p className="text-sm text-teal">บันทึกการมองเห็นแล้ว</p>}
          </div>
        </>
      )}
    </Card>
  );
}
