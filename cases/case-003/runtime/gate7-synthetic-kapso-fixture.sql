-- CASE-003 Gate 7 synthetic Kapso binding and channel identity.
-- Synthetic phone-number IDs and sender IDs only.
insert into case003.channel_connector_binding(
  id,tenant_id,provider,channel,provider_channel_key,connector_account_ref,status
)
values(
  '70000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000000',
  'kapso',
  'whatsapp',
  '999000111222333',
  'synthetic-gate7-kapso',
  'active'
)
on conflict (id) do nothing;

insert into case003.external_identity(
  id,tenant_id,user_id,channel,subject_hash,status,verified_at
)
values(
  '70000000-0000-0000-0000-000000000011',
  '30000000-0000-0000-0000-000000000000',
  '50000000-0000-0000-0000-000000000001',
  'whatsapp',
  encode(extensions.digest('51999900001','sha256'),'hex'),
  'active',
  now()
)
on conflict (id) do nothing;
