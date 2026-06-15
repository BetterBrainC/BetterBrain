"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { saveSettings, uploadLogo } from "@/actions/settings";
import type { SettingsData } from "@/lib/data/queries";

export function SettingsForm({ initial }: { initial: SettingsData }) {
  const router = useRouter();
  const [companyName, setCompanyName] = React.useState(initial.companyName);
  const [logoUrl, setLogoUrl] = React.useState(initial.logoUrl ?? "");
  const [selfie, setSelfie] = React.useState(initial.selfieEnforced);
  const [late, setLate] = React.useState(String(initial.lateThresholdMin));
  const [early, setEarly] = React.useState(String(initial.earlyThresholdMin));
  const [radius, setRadius] = React.useState(String(initial.geofenceRadiusM));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  async function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadLogo(fd);
    setUploading(false);
    e.target.value = "";
    if (res.error) return setError(res.error);
    if (res.url) setLogoUrl(res.url);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await saveSettings({
      companyName,
      logoUrl: logoUrl || null,
      selfieEnforced: selfie,
      lateThresholdMin: Number(late) || 0,
      earlyThresholdMin: Number(early) || 0,
      geofenceRadiusM: Number(radius) || 0,
    });
    setBusy(false);
    if (res.error) return setError(res.error);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5">
      <h1 className="font-display text-2xl font-bold text-navy">ตั้งค่าระบบ</h1>

      <Card className="space-y-4">
        <CardTitle className="text-base">บริษัท</CardTitle>
        <Field label="ชื่อบริษัท">
          <TextInput value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
        </Field>
        <Field label="โลโก้ (URL)" hint="วางลิงก์ หรืออัปโหลดไฟล์ด้านล่าง">
          <TextInput value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" />
        </Field>
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="โลโก้" className="h-12 w-12 rounded-md border border-border object-contain" />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-md border border-dashed border-border text-2xs text-faint">โลโก้</span>
          )}
          <label className="cursor-pointer rounded-md border border-border px-3 py-2 text-sm font-medium text-ink hover:bg-surface-tint">
            {uploading ? "กำลังอัปโหลด…" : "อัปโหลดโลโก้"}
            <input type="file" accept="image/*" className="hidden" onChange={onLogoFile} disabled={uploading} />
          </label>
        </div>
      </Card>

      <Card className="space-y-4">
        <CardTitle className="text-base">การเช็คอิน</CardTitle>
        <label className="flex items-center justify-between">
          <span className="text-sm text-ink">บังคับถ่ายเซลฟี่ตอนเช็คอิน</span>
          <button
            type="button"
            onClick={() => setSelfie((v) => !v)}
            aria-pressed={selfie}
            className={"relative h-6 w-11 rounded-full transition-colors " + (selfie ? "bg-primary" : "bg-border-strong")}
          >
            <span className={"absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all " + (selfie ? "left-[22px]" : "left-0.5")} />
          </button>
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="เกณฑ์สาย (นาที)"><TextInput type="number" value={late} onChange={(e) => setLate(e.target.value)} /></Field>
          <Field label="เกณฑ์ออกก่อนเวลา (นาที)"><TextInput type="number" value={early} onChange={(e) => setEarly(e.target.value)} /></Field>
          <Field label="รัศมี geofence (ม.)"><TextInput type="number" value={radius} onChange={(e) => setRadius(e.target.value)} /></Field>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {error && <p className="text-sm text-[var(--danger-fg)]">{error}</p>}
        {saved && !error && <p className="text-sm text-teal">บันทึกแล้ว</p>}
        <Button type="submit" disabled={busy}>{busy ? "กำลังบันทึก…" : "บันทึก"}</Button>
      </div>
    </form>
  );
}
