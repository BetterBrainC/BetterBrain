-- ════════════════════════════════════════════════════════════════════════
-- TPM · 0006 — registration_links
-- Opaque, server-resolved registration links (the token is NOT the HN, so the
-- public /register/[token] link is not enumerable). Admin creates a link; the
-- relative fills the intake; submission resolves token → HN via the service
-- role and upserts the patient by HN, then stamps used_at.
--
-- Mirrors the live table applied via MCP migration `add_registration_links`
-- (kept in source to avoid schema/DB drift). Anon never gets a grant; the
-- public register page reads it with the service-role client server-side.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.registration_links (
  token       text primary key,
  hn          text not null,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  used_at     timestamptz
);

alter table public.registration_links enable row level security;
alter table public.registration_links force row level security;

-- Only staff (admin/director) may create/read links from the client.
drop policy if exists reglink_staff_all on public.registration_links;
create policy reglink_staff_all on public.registration_links
  for all using (public.is_staff()) with check (public.is_staff());
