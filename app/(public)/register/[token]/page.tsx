import { IntakeForm, type IntakeInitial } from "@/components/forms/intake-form";
import { submitRegistration } from "@/actions/patients";
import { createAdminClient } from "@/lib/supabase/admin";
import { APP } from "@/lib/i18n/th";

export const metadata = { title: "ลงทะเบียนผู้รับบริการ" };

/**
 * Public registration link the relative fills before the first visit. Admin
 * pre-creates an opaque token (not the HN) via "สร้าง HN + ส่งลิงก์"; here we
 * resolve token → HN server-side with the service-role client (no RLS for anon).
 */
export default async function RegisterPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("registration_links")
    .select("hn, created_at")
    .eq("token", token)
    .maybeSingle();
  const l = link as { hn: string; created_at: string } | null;
  // Links expire after 14 days (mirrors the action-layer guard).
  const expired = l ? Date.now() - new Date(l.created_at).getTime() > 14 * 86_400_000 : false;
  const hn = l && !expired ? l.hn : null;

  if (!hn) {
    return (
      <main className="mx-auto max-w-md px-[var(--gutter-page)] py-20 text-center">
        <h1 className="font-display text-xl font-bold text-navy">ลิงก์ไม่ถูกต้องหรือหมดอายุ</h1>
        <p className="mt-2 text-sm text-muted">กรุณาติดต่อเจ้าหน้าที่เพื่อขอลิงก์ลงทะเบียนใหม่</p>
      </main>
    );
  }

  // Prefill any already-saved values (relative may re-open the link to edit).
  const { data: existing } = await admin
    .from("patients")
    .select("*")
    .eq("hn", hn)
    .maybeSingle();
  const p = existing as Record<string, string | number | null> | null;
  const initial: IntakeInitial | undefined = p
    ? {
        full_name: p.full_name as string,
        age_years: p.age_years as number | null,
        dob: p.dob as string | null,
        national_id: p.national_id as string | null,
        nationality: p.nationality as string | null,
        race: p.race as string | null,
        marital_status: p.marital_status as string | null,
        gender: p.gender as string | null,
        phone: p.phone as string | null,
        address: p.address as string | null,
        underlying: p.underlying as string | null,
        drug_allergy: p.drug_allergy as string | null,
        past_history: p.past_history as string | null,
        surgery_history: p.surgery_history as string | null,
        chief_complaint: p.chief_complaint as string | null,
        training_program: p.training_program as string | null,
        ec_name: p.emergency_contact_name as string | null,
        ec_relation: p.emergency_contact_relation as string | null,
        ec_phone: p.emergency_contact_phone as string | null,
        home_lat: p.home_lat as number | null,
        home_lng: p.home_lng as number | null,
        map_url: p.map_url as string | null,
      }
    : undefined;

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-[var(--gutter-page)] py-10">
      <header className="space-y-1 text-center">
        <p className="text-sm font-medium text-primary">{APP.org}</p>
        <h1 className="font-display text-2xl font-bold text-navy">ลงทะเบียนผู้รับบริการ</h1>
        <p className="text-sm text-muted">กรุณากรอกข้อมูลให้ครบถ้วน (HN {hn})</p>
      </header>
      <IntakeForm action={submitRegistration} mode="relative" hn={hn} token={token} initial={initial} />
    </main>
  );
}
