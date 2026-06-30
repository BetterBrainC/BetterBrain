-- ════════════════════════════════════════════════════════════════════════
-- Seed data — safe to run repeatedly (idempotent upserts).
-- ════════════════════════════════════════════════════════════════════════

-- Singleton settings row.
insert into public.settings (id, company_name)
values (1, 'Better Brain Rehab at Home')
on conflict (id) do nothing;

-- Diagnosis categories (for statistics; store full English names).
insert into public.diagnoses (category, label_en, sort) values
  ('stroke',             'Stroke',                          1),
  ('parkinson',          'Parkinson',                       2),
  ('dementia_alzheimer', 'Dementia / Alzheimer',            3),
  ('als',                'Amyotrophic Lateral Sclerosis (ALS)', 4),
  ('ms',                 'Multiple Sclerosis (MS)',         5),
  ('other',              'Other',                           6)
on conflict (category) do update set label_en = excluded.label_en, sort = excluded.sort;

-- ── Director accounts (max 2) ───────────────────────────────────────────
-- Auth users cannot be seeded reliably via plain SQL. Create the 2 director
-- accounts first (Supabase dashboard → Authentication, or the admin API),
-- then promote them by email:
--
--   update public.profiles p set role = 'director', full_name = 'Director 1'
--   from auth.users u
--   where u.email = 'director1@betterbrain.co' and p.id = u.id;
--
--   update public.profiles p set role = 'director', full_name = 'Director 2'
--   from auth.users u
--   where u.email = 'director2@betterbrain.co' and p.id = u.id;
--
-- Promote an Admin account the same way with role = 'admin'.
