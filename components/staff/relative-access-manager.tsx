"use client";

import * as React from "react";
import { Share2, Copy, Check } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { createRelativeShareLink, setRelativeReportVisibility, setRelativePortalProgram } from "@/actions/portal";
import type { RelativeManagePatient } from "@/lib/data/queries";

/**
 * Pick a recipient → copy their relatives-portal link + choose which reports the
 * relatives portal shows + pin which โปรแกรมฝึกที่บ้าน the portal sends.
 */
export function RelativeAccessManager({
  patients,
  programs = [],
}: {
  patients: RelativeManagePatient[];
  programs?: string[];
}) {
  const [id, setId] = React.useState("");
  const selected = patients.find((p) => p.id === id) ?? null;

  const [link, setLink] = React.useState<string | null>(null);
  const [hasLink, setHasLink] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [showAssessment, setShowAssessment] = React.useState(true);
  const [showFollowup, setShowFollowup] = React.useState(true);
  const [showSummary, setShowSummary] = React.useState(true);
  const [visBusy, setVisBusy] = React.useState(false);
  const [visMsg, setVisMsg] = React.useState<{ ok?: boolean; error?: string } | null>(null);
  const [portalProgram, setPortalProgram] = React.useState("");
  const [progBusy, setProgBusy] = React.useState(false);
  const [progMsg, setProgMsg] = React.useState<{ ok?: boolean; error?: string } | null>(null);

  React.useEffect(() => {
    setErr(null);
    setCopied(false);
    setVisMsg(null);
    setProgMsg(null);
    if (!selected) {
      setLink(null);
      setHasLink(false);
      return;
    }
    setShowAssessment(selected.showAssessment);
    setShowFollowup(selected.showFollowup);
    setShowSummary(selected.showSummary);
    setPortalProgram(selected.portalProgram ?? "");
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

  async function saveVisibility(next: { assessment: boolean; followup: boolean; summary: boolean }) {
    if (!selected) return;
    setShowAssessment(next.assessment);
    setShowFollowup(next.followup);
    setShowSummary(next.summary);
    setVisBusy(true);
    setVisMsg(null);
    const res = await setRelativeReportVisibility({
      patientId: selected.id,
      showAssessment: next.assessment,
      showFollowup: next.followup,
      showSummary: next.summary,
    });
    setVisBusy(false);
    setVisMsg(res);
  }

  async function savePortalProgram(program: string) {
    if (!selected) return;
    setPortalProgram(program);
    setProgBusy(true);
    setProgMsg(null);
    const res = await setRelativePortalProgram({ patientId: selected.id, program });
    setProgBusy(false);
    setProgMsg(res);
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
                  checked={showAssessment}
                  disabled={!hasLink || visBusy}
                  onChange={(e) => saveVisibility({ assessment: e.target.checked, followup: showFollowup, summary: showSummary })}
                />
                รายงานประเมินแรกรับ (Assessment)
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--primary)]"
                  checked={showFollowup}
                  disabled={!hasLink || visBusy}
                  onChange={(e) => saveVisibility({ assessment: showAssessment, followup: e.target.checked, summary: showSummary })}
                />
                รายงานประจำวัน (Follow up)
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--primary)]"
                  checked={showSummary}
                  disabled={!hasLink || visBusy}
                  onChange={(e) => saveVisibility({ assessment: showAssessment, followup: showFollowup, summary: e.target.checked })}
                />
                รายงานความก้าวหน้ารายเดือน (Summary)
              </label>
            </div>
            {visMsg?.error && <p className="text-sm text-[var(--danger-fg)]">{visMsg.error}</p>}
            {visMsg?.ok && <p className="text-sm text-teal">บันทึกการมองเห็นแล้ว</p>}
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-sm font-medium text-ink">โปรแกรมฝึกที่บ้านที่ส่งให้ญาติ</p>
            <p className="text-xs text-muted">
              เลือกส่งเฉพาะโปรแกรมใดโปรแกรมหนึ่ง เช่น ผู้รับบริการฝึกกลืน ส่งเฉพาะโปรแกรมฝึกกลืนที่บ้าน
            </p>
            <Select
              value={portalProgram}
              disabled={progBusy}
              onChange={(e) => savePortalProgram(e.target.value)}
              aria-label="โปรแกรมฝึกที่บ้านที่ส่งให้ญาติ"
            >
              <option value="">
                ตามโปรแกรมของผู้รับบริการ{selected.program ? ` (${selected.program})` : " (ยังไม่กำหนด)"}
              </option>
              {programs.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
            {progMsg?.error && <p className="text-sm text-[var(--danger-fg)]">{progMsg.error}</p>}
            {progMsg?.ok && <p className="text-sm text-teal">บันทึกโปรแกรมที่ส่งแล้ว</p>}
          </div>
        </>
      )}
    </Card>
  );
}
