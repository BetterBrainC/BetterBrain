-- ════════════════════════════════════════════════════════════════════════
-- TPM 0008 — relatives-portal completeness + access auto-revoke on Summary.
--   • relative_access: clinic-selectable report visibility (followup/summary)
--   • push_subscriptions: allow relative (non-auth) Web Push subscriptions
--   • trigger: saving a Summary on a FINISHED course revokes relative +
--     employee access and marks the course complete (audit-logged)
-- ════════════════════════════════════════════════════════════════════════

-- ── relative_access: which report types the clinic exposes to relatives ───
alter table public.relative_access
  add column if not exists show_followup boolean not null default true,
  add column if not exists show_summary  boolean not null default true;

-- ── push_subscriptions: relatives are NOT auth users — allow relative-owned
--    rows (profile_id null + relative_id set). Exactly one owner per row.
alter table public.push_subscriptions alter column profile_id drop not null;
alter table public.push_subscriptions
  add column if not exists relative_id uuid references public.relatives(id) on delete cascade;
do $$ begin
  alter table public.push_subscriptions
    add constraint chk_push_owner check (num_nonnulls(profile_id, relative_id) = 1);
exception when duplicate_object then null; end $$;
create index if not exists idx_push_relative on public.push_subscriptions(relative_id);
-- RLS unchanged: push_all (profile_id = auth.uid()) still scopes staff rows;
-- relative rows are written only via the service-role client (RLS bypassed).

-- ── Auto-revoke: completing a Summary on a finished course ends access ────
-- Fires when a 'summary' report becomes completed. If the course has 0
-- sessions remaining (or is already course_complete), mark it complete, revoke
-- relatives' portal links, drop the employee assignment(s), and audit it.
create or replace function public.revoke_access_on_summary()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_remaining int;
  v_status public.course_status;
begin
  if new.report_type <> 'summary' or new.status <> 'completed' or new.course_id is null then
    return new;
  end if;

  select remaining_sessions into v_remaining
    from public.course_progress where course_id = new.course_id;
  select status into v_status from public.courses where id = new.course_id;

  -- Only end access once the course is actually finished.
  if coalesce(v_remaining, 1) > 0 and v_status is distinct from 'course_complete' then
    return new;
  end if;

  update public.courses
     set status = 'course_complete', completed_on = coalesce(completed_on, current_date)
   where id = new.course_id and status <> 'course_complete';

  update public.relative_access
     set revoked = true
   where patient_id = new.patient_id and revoked = false;

  insert into public.audit_logs(actor_id, action, entity, entity_id, after, context)
  values (auth.uid(), 'access_revoke', 'patient', new.patient_id::text,
          jsonb_build_object('reason', 'summary_completed', 'course_id', new.course_id),
          jsonb_build_object('report_id', new.id));

  delete from public.patient_assignments where patient_id = new.patient_id;
  return new;
end $$;
revoke execute on function public.revoke_access_on_summary() from public, anon, authenticated;

drop trigger if exists trg_revoke_on_summary on public.reports;
create trigger trg_revoke_on_summary
  after insert or update of status on public.reports
  for each row execute function public.revoke_access_on_summary();
