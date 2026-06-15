"use client";

import * as React from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { uploadReportPhoto } from "@/actions/reports";

/**
 * Photo/evidence attach for clinical reports. Uploads to the private
 * `attachments` bucket and emits hidden `photos` inputs (storage paths) so the
 * surrounding report form serializes them into the payload. Previews use a local
 * object URL (the bucket is private; viewing later uses signed URLs).
 */
export function ReportPhotoUpload({ sessionId }: { sessionId: string }) {
  const [items, setItems] = React.useState<{ path: string; preview: string }[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("sessionId", sessionId);
    const res = await uploadReportPhoto(fd);
    setBusy(false);
    if (res.error || !res.path) {
      setError(res.error ?? "อัปโหลดไม่สำเร็จ");
      return;
    }
    setItems((s) => [...s, { path: res.path as string, preview: URL.createObjectURL(file) }]);
  }

  function remove(path: string) {
    setItems((s) => s.filter((i) => i.path !== path));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <div key={it.path} className="relative h-20 w-20 overflow-hidden rounded-md border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.preview} alt="รูปแนบ" className="h-full w-full object-cover" />
            <input type="hidden" name="photos" value={it.path} />
            <button
              type="button"
              onClick={() => remove(it.path)}
              aria-label="ลบรูป"
              className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-md border border-dashed border-border text-faint hover:bg-surface-tint">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFile}
            disabled={busy}
          />
        </label>
      </div>
      {error && <p className="text-xs text-[var(--danger-fg)]">{error}</p>}
    </div>
  );
}
