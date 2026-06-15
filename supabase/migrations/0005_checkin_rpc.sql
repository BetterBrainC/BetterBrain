-- ════════════════════════════════════════════════════════════════════════
-- 0005 — employee check-in/out + Follow-up RPCs (SECURITY DEFINER).
-- Employees cannot write schedule_sessions directly (RLS = staff only), so the
-- attendance status flip happens inside these definer functions, which verify
-- the caller owns the session.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.record_check_event(
  p_session_id uuid,
  p_kind public.checkin_kind,
  p_lat double precision,
  p_lng double precision,
  p_distance_m double precision,
  p_within boolean,
  p_is_late boolean default false,
  p_is_early boolean default false
) returns void language plpgsql security definer set search_path = public as $$
declare v_emp uuid;
begin
  select employee_id into v_emp from public.schedule_sessions where id = p_session_id;
  if v_emp is null or v_emp <> auth.uid() then
    raise exception 'not authorized for this session';
  end if;
  insert into public.check_ins(id, session_id, employee_id, kind, client_event_at,
    lat, lng, distance_m, within_geofence, is_late, is_early)
  values (gen_random_uuid(), p_session_id, auth.uid(), p_kind, now(),
    p_lat, p_lng, p_distance_m, p_within, coalesce(p_is_late,false), coalesce(p_is_early,false))
  on conflict (session_id, kind) do nothing;
  if p_kind = 'check_in' then
    update public.schedule_sessions
      set status = case when coalesce(p_is_late,false) then 'late'::session_status else 'in_progress'::session_status end
      where id = p_session_id and status in ('scheduled','rescheduled');
  end if;
end $$;

create or replace function public.save_followup(
  p_session_id uuid,
  p_payload jsonb default '{}',
  p_fois public.fois_level default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_emp uuid; v_patient uuid; v_course uuid; v_checkin uuid; v_report uuid;
begin
  select employee_id, patient_id, course_id into v_emp, v_patient, v_course
    from public.schedule_sessions where id = p_session_id;
  if v_emp is null or v_emp <> auth.uid() then
    raise exception 'not authorized for this session';
  end if;
  select id into v_checkin from public.check_ins where session_id = p_session_id and kind = 'check_in' limit 1;
  insert into public.reports(report_type, patient_id, course_id, session_id, author_id, check_in_id, status, payload, fois_level, completed_at)
  values ('followup', v_patient, v_course, p_session_id, auth.uid(), v_checkin, 'completed', coalesce(p_payload,'{}'::jsonb), p_fois, now())
  returning id into v_report;
  update public.schedule_sessions set status = 'completed' where id = p_session_id;
  return v_report;
end $$;

revoke execute on function public.record_check_event(uuid,public.checkin_kind,double precision,double precision,double precision,boolean,boolean,boolean) from public, anon;
grant  execute on function public.record_check_event(uuid,public.checkin_kind,double precision,double precision,double precision,boolean,boolean,boolean) to authenticated;
revoke execute on function public.save_followup(uuid,jsonb,public.fois_level) from public, anon;
grant  execute on function public.save_followup(uuid,jsonb,public.fois_level) to authenticated;
