-- ════════════════════════════════════════════════════════════════════════
-- 0004_hardening.sql — resolve Supabase security advisors after 0001–0003.
-- (RLS-helper fns is_staff/is_director/is_admin/current_user_role/is_enabled/
--  can_access_patient KEEP execute — RLS policies call them, so they must stay
--  executable by `authenticated`; only trigger-only fns get execute revoked.)
-- ════════════════════════════════════════════════════════════════════════

-- 1) course_progress view respects the querying user's RLS (was SECURITY DEFINER).
alter view public.course_progress set (security_invoker = on);

-- 2) Pin search_path on trigger functions (function_search_path_mutable).
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create or replace function public.reports_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    new.completed_at := now();
  end if;
  if old.status = 'completed' and new.status = 'draft' and not public.is_staff() then
    raise exception 'employees cannot revert a completed report to draft';
  end if;
  return new;
end $$;

create or replace function public.profiles_self_guard()
returns trigger language plpgsql set search_path = public as $$
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

-- 3) Trigger-only functions are not meant to be PostgREST RPC endpoints.
revoke execute on function public.set_updated_at()       from public, anon, authenticated;
revoke execute on function public.reports_guard()        from public, anon, authenticated;
revoke execute on function public.profiles_self_guard()  from public, anon, authenticated;
revoke execute on function public.handle_new_user()      from public, anon, authenticated;
revoke execute on function public.enforce_director_cap() from public, anon, authenticated;

-- 4) check_ins update: tighten WITH CHECK (was always-true).
drop policy if exists checkins_update on public.check_ins;
create policy checkins_update on public.check_ins for update
  using (
    public.is_director()
    or (public.is_admin() and exists (
      select 1 from public.correction_requests cc
      where cc.check_in_id = check_ins.id and cc.status = 'approved'))
  )
  with check (public.is_director() or public.is_admin());
