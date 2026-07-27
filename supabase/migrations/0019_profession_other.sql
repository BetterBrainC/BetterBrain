-- วิชาชีพ "อื่นๆ": client review 27/7/2569 — the add/edit employee form needs a
-- third profession choice besides PT/OT. Position title still carries the free-
-- text detail; 'other' just makes the grouping explicit (vs null = ไม่ระบุ).
alter type profession add value if not exists 'other';

comment on column public.profiles.profession is 'นักกายภาพบำบัด=pt / นักกิจกรรมบำบัด=ot / อื่นๆ=other';
