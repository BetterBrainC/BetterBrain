-- 0018: let ADMIN read patient-target KPI evaluations (client 22 ก.ค. 2569).
--
-- The per-recipient stats page (สถิติการประเมิน: การประเมิน/FOIS/Barthel/FIM +
-- แนวโน้มคะแนน) must render for both admin and Director. kpi_evaluations SELECT
-- was Director-only (0009), so admin always saw blanks. Patient-scale rows
-- (target='patient') open up to staff; EMPLOYEE-target results (เช็คสุขภาพใจ /
-- แบบทบทวนความรู้) stay Director-only.

drop policy if exists kpi_eval_select on public.kpi_evaluations;
create policy kpi_eval_select on public.kpi_evaluations for select
  using (
    public.is_director()
    or (public.is_staff() and target = 'patient')
  );
