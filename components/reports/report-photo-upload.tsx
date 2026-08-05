"use client";

import * as React from "react";
import { ImagePlus, ImageIcon, X, Loader2 } from "lucide-react";
import { uploadReportPhoto } from "@/actions/reports";
import { useDraftPhotos } from "@/components/reports/report-shell";

/**
 * Photo/evidence attach for clinical reports. Uploads to the private
 * `attachments` bucket and emits hidden `photos` inputs (storage paths) so the
 * surrounding report form serializes them into the payload. Previews use a local
 * object URL (the bucket is private; viewing later uses signed URLs).
 *
 * No `capture` attribute: it pinned mobile to the live camera, so a photo taken
 * earlier could not be attached (client 5 ส.ค. 2569 — "รบกวนทำให้ดึงรูปจากแกลเลอรี่
 * ได้ด้วย"). Without it the OS offers camera *and* gallery, and several shots can
 * be picked in one go.
 */
export function ReportPhotoUpload({
  sessionId,
  initialPaths,
}: {
  sessionId: string;
  initialPaths?: string[];
}) {
  // Paths restored from a draft have no local preview — the bucket is private.
  const draftPaths = useDraftPhotos();
  const restored = initialPaths ?? draftPaths;
  const [items, setItems] = React.useState<{ path: string; preview: string | null }[]>(() =>
    restored.map((path) => ({ path, preview: null })),
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("sessionId", sessionId);
        const res = await uploadReportPhoto(fd);
        if (res.error || !res.path) {
          setError(res.error ?? "อัปโหลดไม่สำเร็จ");
          break;
        }
        const path = res.path;
        setItems((s) => [...s, { path, preview: URL.createObjectURL(file) }]);
      }
    } catch {
      setError("อัปโหลดไม่สำเร็จ — ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  function remove(path: string) {
    setItems((s) => s.filter((i) => i.path !== path));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <div key={it.path} className="relative h-20 w-20 overflow-hidden rounded-md border border-border">
            {it.preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.preview} alt="รูปแนบ" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center bg-surface-tint text-faint" title="รูปที่แนบไว้ในร่าง">
                <ImageIcon className="h-5 w-5" />
              </span>
            )}
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
          <span className="sr-only">แนบรูป (ถ่ายใหม่ หรือเลือกจากแกลเลอรี)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onFiles}
            disabled={busy}
          />
        </label>
      </div>
      {error && <p className="text-xs text-[var(--danger-fg)]">{error}</p>}
    </div>
  );
}
