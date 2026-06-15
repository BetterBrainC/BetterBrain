"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { inputClsLg } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { APP } from "@/lib/i18n/th";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pw, setPw] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) return setError("รหัสผ่านอย่างน้อย 6 ตัวอักษร");
    if (pw !== pw2) return setError("รหัสผ่านไม่ตรงกัน");
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) {
        setError("ลิงก์หมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่");
      } else {
        setDone(true);
        setTimeout(() => router.push("/login"), 1500);
      }
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
          <h1 className="font-display text-2xl font-bold text-navy">ตั้งรหัสผ่านใหม่</h1>
          <p className="text-sm text-muted">{APP.org}</p>
        </div>

        <Card className="space-y-4">
          {done ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-teal" />
              <p className="mt-3 text-sm text-ink">ตั้งรหัสผ่านใหม่เรียบร้อย</p>
              <p className="mt-1 text-xs text-muted">กำลังพาไปหน้าเข้าสู่ระบบ…</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="pw" className="text-sm font-medium text-ink">รหัสผ่านใหม่</label>
                <input id="pw" type="password" autoComplete="new-password" required
                  value={pw} onChange={(e) => setPw(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร" className={inputClsLg} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="pw2" className="text-sm font-medium text-ink">ยืนยันรหัสผ่าน</label>
                <input id="pw2" type="password" autoComplete="new-password" required
                  value={pw2} onChange={(e) => setPw2(e.target.value)} className={inputClsLg} />
              </div>
              {error && (
                <p className="rounded-md bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-fg)]">{error}</p>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? "กำลังบันทึก…" : "ตั้งรหัสผ่านใหม่"}
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
