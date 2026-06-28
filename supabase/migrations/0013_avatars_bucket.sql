-- ════════════════════════════════════════════════════════════════════════
-- TPM 0013 — PUBLIC "avatars" bucket for employee photos (รูปพนักงาน, client
-- brief 28/6/2569). Headshots are non-clinical, so they live in a public bucket
-- (served by URL) — unlike the private "attachments" bucket for clinical photos
-- and selfies. Uploaded via the service-role client (admin only). Idempotent.
-- ════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit)
values ('avatars', 'avatars', true, 4194304)
on conflict (id) do nothing;
