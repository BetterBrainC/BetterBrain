"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { createRegistrationLink } from "@/actions/patients";

/**
 * Admin: create an HN (digits only) → generate an OPAQUE, single-use Thai
 * registration link to send to the relative. The token is random (not the HN),
 * so the link is not enumerable.
 */
export function RegisterLinkModal() {
  const [open, setOpen] = React.useState(false);
  const [hn, setHn] = React.useState("");
  const [link, setLink] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function generate() {
    if (!/^\d{4,}$/.test(hn)) return;
    setBusy(true);
    setError(null);
    setLink(null);
    const res = await createRegistrationLink({ hn });
    setBusy(false);
    if (res.error || !res.token) return setError(res.error ?? "สร้างลิงก์ไม่สำเร็จ");
    const base =
      typeof window !== "undefined" ? window.location.origin : "https://tpm.app";
    setLink(`${base}/register/${res.token}`);
    setCopied(false);
  }

  async function copy() {
    if (!link || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        สร้าง HN + ส่งลิงก์
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="สร้าง HN + ส่งลิงก์ลงทะเบียน"
      >
        <div className="space-y-4">
          <Field label="HN (เลขล้วน)" hint="เช่น 69010000">
            <TextInput
              inputMode="numeric"
              value={hn}
              onChange={(e) => setHn(e.target.value.replace(/\D/g, ""))}
              placeholder="69010000"
            />
          </Field>
          <Button className="w-full" onClick={generate} disabled={hn.length < 4 || busy}>
            {busy ? "กำลังสร้างลิงก์…" : "สร้างลิงก์"}
          </Button>
          {error && <p className="text-sm text-[var(--danger-fg)]">{error}</p>}

          {link && (
            <div className="space-y-2 rounded-md bg-surface-tint p-3">
              <p className="text-xs text-muted">ลิงก์สำหรับส่งให้ญาติ (ภาษาไทย):</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-surface px-2 py-1 text-xs text-primary-700">
                  {link}
                </code>
                <Button size="icon" variant="secondary" onClick={copy} aria-label="คัดลอกลิงก์">
                  {copied ? <Check className="h-4 w-4 text-teal" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <span role="status" aria-live="polite" className="block text-2xs text-teal">
                {copied ? "คัดลอกลิงก์แล้ว" : ""}
              </span>
              <p className="text-2xs text-faint">
                ลิงก์เป็นรหัสสุ่ม (เดาไม่ได้) · ญาติกรอกข้อมูลผ่านลิงก์ · พนักงานเติมส่วนที่ขาดตอนประเมินแรกรับ
              </p>
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
}
