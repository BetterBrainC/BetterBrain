-- รายงานประเมินแรกรับทางกิจกรรมบำบัด — the Thai letterhead report handed to the
-- family, distinct from the (English) Swallowing/Hand assessment forms the OT
-- fills in for the clinic's own records. Client decision 2026-07-17: it is its
-- own report, not an appendix of the Swallowing assessment.
--
-- Not check-in gated: like `summary`, it is written up from the assessment
-- rather than captured at the patient's home, so `chk_report_requires_checkin`
-- (which lists only assessment_swallow / assessment_hand / followup) is left
-- untouched and the new value falls outside it.
alter type report_type add value if not exists 'assessment_report';
