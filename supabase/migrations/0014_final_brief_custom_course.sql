-- ════════════════════════════════════════════════════════════════════════
-- 0014_final_brief_custom_course.sql
-- Client "แก้ไขแบบ Final": Admin opens a course with a CUSTOM session count
-- (no fixed package). Adds a 'custom' course_type and relaxes the package CHECK
-- so base/bonus can be any sane positive numbers. Presets (10+1 / 30) still
-- pass the relaxed check; their exact shape is enforced in the server action.
-- ════════════════════════════════════════════════════════════════════════

alter type course_type add value if not exists 'custom';

alter table public.courses drop constraint if exists chk_course_pkg;
alter table public.courses add constraint chk_course_pkg check (
  base_sessions >= 1 and bonus_sessions >= 0
);
