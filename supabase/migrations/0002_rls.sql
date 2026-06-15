-- ════════════════════════════════════════════════════════════════════════
-- TPM — Row Level Security. Default-deny: enable RLS on every table, then add
-- least-privilege policies. See docs/DATA-MODEL.md §RLS.
-- ════════════════════════════════════════════════════════════════════════

alter table public.profiles            enable row level security;
alter table public.settings            enable row level security;
alter table public.diagnoses           enable row level security;
alter table public.work_hour_slots     enable row level security;
alter table public.patients            enable row level security;
alter table public.patient_assignments enable row level security;
alter table public.bookings            enable row level security;
alter table public.courses             enable row level security;
alter table public.schedule_sessions   enable row level security;
alter table public.check_ins           enable row level security;
alter table public.reports             enable row level security;
alter table public.kpi_templates       enable row level security;
alter table public.kpi_evaluations     enable row level security;
alter table public.correction_requests enable row level security;
alter table public.relatives           enable row level security;
alter table public.relative_access     enable row level security;
alter table public.notifications       enable row level security;
alter table public.push_subscriptions  enable row level security;
alter table public.audit_logs          enable row level security;

-- ── profiles ────────────────────────────────────────────────────────────
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_staff());
create policy profiles_insert on public.profiles for insert
  with check (public.is_staff());
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_staff())
  with check (id = auth.uid() or public.is_staff());
create policy profiles_delete on public.profiles for delete
  using (public.is_director());

-- Employees may not self-edit privileged fields (role/license/code/enabled).
create or replace function public.profiles_self_guard()
returns trigger language plpgsql as $$
begin
  if not public.is_staff() and auth.uid() = new.id then
    if new.role is distinct from old.role
       or new.license_no is distinct from old.license_no
       or new.employee_code is distinct from old.employee_code
       or new.is_enabled is distinct from old.is_enabled then
      raise exception 'employees may only edit phone/photo on their own profile';
    end if;
  end if;
  return new;
end $$;
create trigger trg_profiles_self_guard before update on public.profiles
  for each row execute function public.profiles_self_guard();

-- ── settings ────────────────────────────────────────────────────────────
create policy settings_select on public.settings for select
  using (auth.uid() is not null);
create policy settings_update on public.settings for update
  using (public.is_staff()) with check (public.is_staff());

-- ── diagnoses ───────────────────────────────────────────────────────────
create policy diagnoses_select on public.diagnoses for select
  using (auth.uid() is not null);
create policy diagnoses_write on public.diagnoses for all
  using (public.is_staff()) with check (public.is_staff());

-- ── work_hour_slots ─────────────────────────────────────────────────────
create policy slots_select on public.work_hour_slots for select
  using (public.is_staff() or employee_id = auth.uid());
create policy slots_write on public.work_hour_slots for all
  using (public.is_staff()) with check (public.is_staff());

-- ── patients (assigned-only for employees; address NOT masked) ──────────
create policy patients_select on public.patients for select
  using (public.can_access_patient(id));
create policy patients_insert on public.patients for insert
  with check (public.is_staff());
create policy patients_update on public.patients for update
  using (public.is_staff()) with check (public.is_staff());
create policy patients_delete on public.patients for delete
  using (public.is_director());

-- ── patient_assignments ─────────────────────────────────────────────────
create policy assign_select on public.patient_assignments for select
  using (public.is_staff() or employee_id = auth.uid());
create policy assign_write on public.patient_assignments for all
  using (public.is_staff()) with check (public.is_staff());

-- ── bookings (public insert handled by a SECURITY DEFINER RPC, P2) ──────
create policy bookings_select on public.bookings for select
  using (public.is_staff());
create policy bookings_write on public.bookings for all
  using (public.is_staff()) with check (public.is_staff());

-- ── courses ─────────────────────────────────────────────────────────────
create policy courses_select on public.courses for select
  using (public.is_staff() or public.can_access_patient(patient_id));
create policy courses_write on public.courses for all
  using (public.is_staff()) with check (public.is_staff());

-- ── schedule_sessions ───────────────────────────────────────────────────
create policy sessions_select on public.schedule_sessions for select
  using (public.is_staff() or employee_id = auth.uid());
create policy sessions_write on public.schedule_sessions for all
  using (public.is_staff()) with check (public.is_staff());

-- ── check_ins (Admin edits only after an approved correction) ───────────
create policy checkins_select on public.check_ins for select
  using (public.is_staff() or employee_id = auth.uid());
create policy checkins_insert on public.check_ins for insert
  with check (employee_id = auth.uid());
create policy checkins_update on public.check_ins for update
  using (
    public.is_director()
    or (public.is_admin() and exists (
      select 1 from public.correction_requests cc
      where cc.check_in_id = check_ins.id and cc.status = 'approved'))
  )
  with check (true);
create policy checkins_delete on public.check_ins for delete
  using (public.is_director());

-- ── reports (vanish-on-save) ────────────────────────────────────────────
create policy reports_select on public.reports for select
  using (public.is_staff() or (author_id = auth.uid() and status = 'draft'));
create policy reports_insert on public.reports for insert
  with check (author_id = auth.uid() and public.can_access_patient(patient_id));
create policy reports_update_employee on public.reports for update
  using (author_id = auth.uid() and status = 'draft')
  with check (author_id = auth.uid());
create policy reports_update_staff on public.reports for update
  using (public.is_staff()) with check (public.is_staff());
create policy reports_delete on public.reports for delete
  using (public.is_director());

-- ── kpi_templates ───────────────────────────────────────────────────────
create policy kpi_tmpl_select on public.kpi_templates for select
  using (auth.uid() is not null);
create policy kpi_tmpl_write on public.kpi_templates for all
  using (public.is_staff()) with check (public.is_staff());

-- ── kpi_evaluations ─────────────────────────────────────────────────────
create policy kpi_eval_select on public.kpi_evaluations for select
  using (
    public.is_staff()
    or (target = 'employee' and employee_id = auth.uid())
    or (target = 'patient' and public.can_access_patient(patient_id))
  );
create policy kpi_eval_insert on public.kpi_evaluations for insert
  with check (
    public.is_staff()
    or (target = 'employee' and employee_id = auth.uid())
    or (target = 'patient' and public.can_access_patient(patient_id))
  );
create policy kpi_eval_update on public.kpi_evaluations for update
  using (public.is_staff()) with check (public.is_staff());

-- (leave_requests removed — leave system deferred to a later HR module)

-- ── correction_requests ─────────────────────────────────────────────────
create policy corr_select on public.correction_requests for select
  using (public.is_staff() or employee_id = auth.uid());
create policy corr_insert on public.correction_requests for insert
  with check (employee_id = auth.uid());
create policy corr_update on public.correction_requests for update
  using (public.is_staff()) with check (public.is_staff());

-- ── relatives / relative_access (managed by staff; portal uses service-role)
create policy relatives_staff on public.relatives for all
  using (public.is_staff()) with check (public.is_staff());
create policy relaccess_staff on public.relative_access for all
  using (public.is_staff()) with check (public.is_staff());

-- ── notifications ───────────────────────────────────────────────────────
create policy notif_select on public.notifications for select
  using (public.is_staff() or recipient_profile_id = auth.uid());
create policy notif_update on public.notifications for update
  using (recipient_profile_id = auth.uid())
  with check (recipient_profile_id = auth.uid());
create policy notif_staff_write on public.notifications for insert
  with check (public.is_staff());

-- ── push_subscriptions (own devices only) ───────────────────────────────
create policy push_all on public.push_subscriptions for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ── audit_logs (director-only read; writes via SECURITY DEFINER paths) ──
create policy audit_select_director on public.audit_logs for select
  using (public.is_director());
