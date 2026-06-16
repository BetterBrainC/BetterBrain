-- ════════════════════════════════════════════════════════════════════════
-- TPM 0011 — make save_followup idempotent for offline sync. Adds an optional
-- client report id so a queued Follow-up flushed after reconnect inserts at most
-- once (on conflict on the PK). Same signature otherwise.
-- ════════════════════════════════════════════════════════════════════════
drop function if exists public.save_followup(uuid, jsonb, public.fois_level);
create or replace function public.save_followup(
  p_session_id uuid,
  p_payload jsonb default '{}',
  p_fois public.fois_level default null,
  p_report_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_emp uuid; v_patient uuid; v_course uuid; v_checkin uuid; v_report uuid;
begin
  select employee_id, patient_id, course_id into v_emp, v_patient, v_course
    from public.schedule_sessions where id = p_session_id;
  if v_emp is null or v_emp <> auth.uid() then
    raise exception 'not authorized for this session';
  end if;
  select id into v_checkin from public.check_ins where session_id = p_session_id and kind = 'check_in' limit 1;
  v_report := coalesce(p_report_id, gen_random_uuid());
  insert into public.reports(id, report_type, patient_id, course_id, session_id, author_id, check_in_id, status, payload, fois_level, completed_at)
  values (v_report, 'followup', v_patient, v_course, p_session_id, auth.uid(), v_checkin, 'completed', coalesce(p_payload, '{}'::jsonb), p_fois, now())
  on conflict (id) do nothing;
  update public.schedule_sessions set status = 'completed' where id = p_session_id;
  return v_report;
end $$;
revoke execute on function public.save_followup(uuid, jsonb, public.fois_level, uuid) from public, anon;
grant  execute on function public.save_followup(uuid, jsonb, public.fois_level, uuid) to authenticated;
