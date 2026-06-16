-- ════════════════════════════════════════════════════════════════════════
-- TPM 0009 — security + correctness hardening (audit findings)
--   • kpi_templates: SELECT staff-only (answer key was readable by any auth user)
--   • kpi_evaluations: SELECT Director-only (การวัดผล is Director-only)
--   • kpi_questions_for_employee(): SECURITY DEFINER RPC that strips answer keys
--   • record_check_event(): server-side geofence enforcement + selfie + client
--     event-id (idempotent offline sync)
--   • courses: CHECK binding package → base/bonus
-- ════════════════════════════════════════════════════════════════════════

-- ── KPI templates: question bank readable by staff only ───────────────────
drop policy if exists kpi_tmpl_select on public.kpi_templates;
create policy kpi_tmpl_select on public.kpi_templates for select
  using (public.is_staff());

-- ── KPI evaluations: results are DIRECTOR-ONLY to read ────────────────────
drop policy if exists kpi_eval_select on public.kpi_evaluations;
create policy kpi_eval_select on public.kpi_evaluations for select
  using (public.is_director());

-- ── Employee question bank WITHOUT the answer key (definer; RLS-bypassing) ─
create or replace function public.kpi_questions_for_employee(
  p_kind public.employee_kpi_kind,
  p_year int
) returns table(template_id uuid, questions jsonb)
language sql security definer set search_path = public stable as $$
  select t.id,
    coalesce((select jsonb_agg(q - 'answer') from jsonb_array_elements(t.questions) q), '[]'::jsonb)
  from public.kpi_templates t
  where t.kind = p_kind and t.period_year = p_year and t.is_active = true
  order by t.created_at desc
  limit 1
$$;
revoke execute on function public.kpi_questions_for_employee(public.employee_kpi_kind, int) from public, anon;
grant  execute on function public.kpi_questions_for_employee(public.employee_kpi_kind, int) to authenticated;

-- ── Check-in RPC: enforce geofence server-side + selfie + client event id ──
drop function if exists public.record_check_event(uuid, public.checkin_kind, double precision, double precision, double precision, boolean, boolean, boolean);
create or replace function public.record_check_event(
  p_session_id uuid,
  p_kind public.checkin_kind,
  p_lat double precision,
  p_lng double precision,
  p_distance_m double precision,
  p_within boolean,
  p_is_late boolean default false,
  p_is_early boolean default false,
  p_selfie_url text default null,
  p_event_id uuid default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_emp uuid; v_patient uuid; v_hlat double precision; v_hlng double precision;
  v_radius int; v_dist double precision; v_id uuid;
begin
  select s.employee_id, s.patient_id into v_emp, v_patient
    from public.schedule_sessions s where s.id = p_session_id;
  if v_emp is null or v_emp <> auth.uid() then
    raise exception 'not authorized for this session';
  end if;

  -- Server-side geofence enforcement (the client check is advisory/bypassable).
  if p_kind = 'check_in' then
    select home_lat, home_lng into v_hlat, v_hlng from public.patients where id = v_patient;
    select geofence_radius_m into v_radius from public.settings where id = 1;
    if v_hlat is not null and v_hlng is not null and p_lat is not null and p_lng is not null then
      v_dist := 2 * 6371000 * asin(sqrt(
        power(sin(radians((p_lat - v_hlat) / 2)), 2)
        + cos(radians(v_hlat)) * cos(radians(p_lat)) * power(sin(radians((p_lng - v_hlng) / 2)), 2)
      ));
      if v_dist > coalesce(v_radius, 1000) then
        raise exception 'OUT_OF_GEOFENCE';
      end if;
    end if;
  end if;

  -- Client-supplied id keeps offline replays idempotent; business idempotency is
  -- the unique(session_id, kind) constraint (one check-in + one check-out / session).
  v_id := coalesce(p_event_id, gen_random_uuid());
  insert into public.check_ins(id, session_id, employee_id, kind, client_event_at,
    lat, lng, distance_m, within_geofence, is_late, is_early, selfie_url)
  values (v_id, p_session_id, auth.uid(), p_kind, now(),
    p_lat, p_lng, p_distance_m, p_within, coalesce(p_is_late, false), coalesce(p_is_early, false), p_selfie_url)
  on conflict (session_id, kind) do nothing;

  if p_kind = 'check_in' then
    update public.schedule_sessions
      set status = case when coalesce(p_is_late, false) then 'late'::session_status else 'in_progress'::session_status end
      where id = p_session_id and status in ('scheduled', 'rescheduled');
  end if;
end $$;
revoke execute on function public.record_check_event(uuid, public.checkin_kind, double precision, double precision, double precision, boolean, boolean, boolean, text, uuid) from public, anon;
grant  execute on function public.record_check_event(uuid, public.checkin_kind, double precision, double precision, double precision, boolean, boolean, boolean, text, uuid) to authenticated;

-- ── Course package shape: bind course_type → base/bonus (new rows only) ────
alter table public.courses drop constraint if exists chk_course_pkg;
alter table public.courses add constraint chk_course_pkg check (
  (course_type = 'pkg_10_plus_1' and base_sessions = 10 and bonus_sessions = 1)
  or (course_type = 'pkg_30' and base_sessions = 30 and bonus_sessions = 0)
) not valid;
