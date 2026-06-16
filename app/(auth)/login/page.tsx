"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { inputClsLg } from "@/components/ui/field";
import { signIn, type SignInState } from "@/actions/auth";
import { APP } from "@/lib/i18n/th";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(
    signIn,
    {},
  );

  return (
    <main className="grid min-h-dvh place-items-center px-[var(--gutter-page)]">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-navy font-display text-lg font-bold text-white">
            T
          </span>
          <h1 className="font-display text-2xl font-bold text-navy">{APP.name}</h1>
          <p className="text-sm text-muted">{APP.org}</p>
        </div>

        <Card className="space-y-4">
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-ink">อีเมล</label>
              <input id="email" name="email" type="email" autoComplete="email" required
                placeholder="director@tpm.com" className={inputClsLg} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-ink">รหัสผ่าน</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required
                className={inputClsLg} />
            </div>
            {state.error && (
              <p className="rounded-md bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-fg)]">
                {state.error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
            </Button>
            <Link href="/forgot" className="block text-center text-sm text-primary">
              ลืมรหัสผ่าน?
            </Link>
          </form>
          {process.env.NODE_ENV !== "production" && (
            <p className="text-center text-xs text-faint">
              ทดลอง: director@tpm.com / admin@tpm.com / employee1@tpm.com · รหัส 123456
            </p>
          )}
        </Card>
      </div>
    </main>
  );
}
