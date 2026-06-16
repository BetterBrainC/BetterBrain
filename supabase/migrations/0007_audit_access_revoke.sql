-- ════════════════════════════════════════════════════════════════════════
-- TPM 0007 — add 'access_revoke' to the audit_action enum.
-- Kept in its own migration: a newly-added enum value cannot be USED in the
-- same transaction that adds it, so 0008 (which references it at runtime)
-- must run after this commits.
-- ════════════════════════════════════════════════════════════════════════
alter type public.audit_action add value if not exists 'access_revoke';
