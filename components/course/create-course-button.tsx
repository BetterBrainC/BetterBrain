"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { createCourse } from "@/actions/courses";

/** Staff control to open a course when a patient has none — custom count or preset. */
export function CreateCourseControl({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [custom, setCustom] = React.useState("");

  async function run(p: Promise<{ error?: string }>) {
    setBusy(true);
    setErr(null);
    const res = await p;
    setBusy(false);
    if (res.error) return setErr(res.error);
    router.refresh();
  }

  return (
    <Card className="space-y-3">
      <CardTitle className="text-base">เปิดคอร์ส</CardTitle>
      <p className="text-sm text-muted">ระบุจำนวนครั้งเอง หรือเลือกแพ็กเกจสำเร็จรูป</p>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Field label="จำนวนครั้ง (กำหนดเอง)">
            <TextInput
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="เช่น 12"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          </Field>
        </div>
        <Button
          disabled={busy || !custom || Number(custom) < 1}
          onClick={() => run(createCourse({ patientId, courseType: "custom", baseSessions: Number(custom) }))}
        >
          เปิดคอร์ส
        </Button>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" className="flex-1" disabled={busy} onClick={() => run(createCourse({ patientId, courseType: "pkg_10_plus_1" }))}>
          <Plus className="h-4 w-4" /> 10 (+1 แถม)
        </Button>
        <Button size="sm" variant="secondary" className="flex-1" disabled={busy} onClick={() => run(createCourse({ patientId, courseType: "pkg_30" }))}>
          <Plus className="h-4 w-4" /> 30 ครั้ง
        </Button>
      </div>
      {err && <p className="text-sm text-[var(--danger-fg)]">{err}</p>}
    </Card>
  );
}
