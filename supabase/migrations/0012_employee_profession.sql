-- Employee profession (วิชาชีพ): นักกายภาพบำบัด (PT) / นักกิจกรรมบำบัด (OT).
-- Client brief 28/6/2569: count + group employees by profession × employment type
-- (OT Full-time / OT Part-time / PT Full-time / PT Part-time). Nullable so legacy
-- rows stay valid; the admin form sets it on create/edit.
create type profession as enum ('pt', 'ot');

alter table public.profiles
  add column profession profession;

comment on column public.profiles.profession is 'นักกายภาพบำบัด=pt / นักกิจกรรมบำบัด=ot';
