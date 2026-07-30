"use client";

import * as React from "react";
import { PencilLine } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { updateMyProfile } from "@/actions/profile";

export interface AccountProfileData {
  fullName: string;
  phone: string;
  positionTitle: string;
  licenseNo: string;
  employeeCode: string;
  email: string;
  photoUrl: string | null;
}

/** Employee profile card with inline self-edit for name + phone. */
export function AccountProfile({ profile }: { profile: AccountProfileData }) {
  const [editing, setEditing] = React.useState(false);
  const [fullName, setFullName] = React.useState(profile.fullName);
  const [phone, setPhone] = React.useState(profile.phone);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await updateMyProfile({ fullName, phone });
    setBusy(false);
    if (res.error) return setError(res.error);
    setEditing(false);
  }

  if (editing) {
    return (
      <form onSubmit={save}>
        <Card className="space-y-3">
          <CardTitle className="text-base">แก้ไขโปรไฟล์</CardTitle>
          <Field label="ชื่อ-สกุล"><TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} required /></Field>
          <Field label="โทรศัพท์"><TextInput type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          {error && <p className="text-sm text-[var(--danger-fg)]">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => { setEditing(false); setFullName(profile.fullName); setPhone(profile.phone); }}>ยกเลิก</Button>
            <Button type="submit" className="flex-1" disabled={busy}>{busy ? "กำลังบันทึก…" : "บันทึก"}</Button>
          </div>
        </Card>
      </form>
    );
  }

  const rows: [string, string][] = [
    ["ชื่อ-สกุล", fullName || "—"],
    ["ตำแหน่ง", profile.positionTitle || "—"],
    ["ใบอนุญาตเลขที่", profile.licenseNo || "—"],
    ["รหัสพนักงาน", profile.employeeCode || "—"],
    ["โทรศัพท์", phone || "—"],
    ["อีเมล", profile.email || "—"],
  ];

  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Photo is set by Admin/Director on the staff side; read-only here. */}
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photoUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <span className="grid h-11 w-11 place-items-center rounded-full bg-surface-tint text-sm font-medium text-muted">
              {fullName.trim().charAt(0) || "—"}
            </span>
          )}
          <CardTitle className="text-base">โปรไฟล์พนักงาน</CardTitle>
        </div>
        <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline">
          <PencilLine className="h-3.5 w-3.5" /> แก้ไข
        </button>
      </div>
      <dl className="grid grid-cols-1 gap-y-1.5 text-sm sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
