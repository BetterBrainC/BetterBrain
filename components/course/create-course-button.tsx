"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createCourse } from "@/actions/courses";

/** Staff control to open a course package when a patient has none yet. */
export function CreateCourseControl({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function create(courseType: "pkg_10_plus_1" | "pkg_30") {
    setBusy(true);
    setErr(null);
    const res = await createCourse({ patientId, courseType });
    setBusy(false);
    if (res.error) return setErr(res.error);
    router.refresh();
  }

  return (
    <Card className="space-y-3">
      <CardTitle className="text-base">เปิดคอร์ส</CardTitle>
      <p className="text-sm text-muted">ยังไม่มีคอร์ส — เลือกแพ็กเกจเพื่อเริ่ม</p>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" disabled={busy} onClick={() => create("pkg_10_plus_1")}>
          <Plus className="h-4 w-4" /> 10 (+1 แถม)
        </Button>
        <Button size="sm" variant="secondary" className="flex-1" disabled={busy} onClick={() => create("pkg_30")}>
          <Plus className="h-4 w-4" /> 30 ครั้ง
        </Button>
      </div>
      {err && <p className="text-sm text-[var(--danger-fg)]">{err}</p>}
    </Card>
  );
}
