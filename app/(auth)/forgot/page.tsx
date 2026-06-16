"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { inputClsLg } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { APP } from "@/lib/i18n/th";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset`,
      });
      if (error) setError("ส่งลิงก์ไม่สำเร็จ กรุณาลองใหม่");
      else setSent(true);
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-[var(--gutter-page)]">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-navy font-display text-lg font-bold text-white">
            T
          </span>
          <h1 className="font-display text-2xl font-bold text-navy">ลืมรหัสผ่าน</h1>
          <p className="text-sm text-muted">{APP.org}</p>
        </div>

        <Card className="space-y-4">
          {sent ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-teal" />
              <p className="mt-3 text-sm text-ink">ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลแล้ว</p>
              <p className="mt-1 text-xs text-muted">กรุณาตรวจสอบกล่องจดหมาย แล้วกดลิงก์เพื่อตั้งรหัสใหม่</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-ink">อีเมล</label>
                <input
                  id="email" name="email" type="email" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@tpm.com" className={inputClsLg}
                />
              </div>
              {error && (
                <p className="rounded-md bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-fg)]">{error}</p>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={busy || !email.trim()}>
                {busy ? "กำลังส่ง…" : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
              </Button>
            </form>
          )}
          <Link href="/login" className="block text-center text-sm text-primary">
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </Card>
      </div>
    </main>
  );
}
