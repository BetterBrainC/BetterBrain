-- ════════════════════════════════════════════════════════════════════════
-- TPM 0010 — provision the PRIVATE "attachments" storage bucket used for
-- clinical report photos and check-in selfies (uploaded via the service-role
-- client; never public). Idempotent.
-- ════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 8388608)
on conflict (id) do nothing;
