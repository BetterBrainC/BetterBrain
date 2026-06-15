-- ════════════════════════════════════════════════════════════════════════
-- Auth hook: auto-create a profile row when an auth user is created.
-- New users default to 'employee'; promote to 'admin'/'director' explicitly (the
-- director cap of 2 is enforced by trg_director_cap in 0001_init.sql).
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'employee'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
