-- CASE-003 Gate 6 synthetic WhatsApp-channel fixture.
-- The subject is opaque synthetic test data, never a real phone number.
insert into case003.external_identity(
  id,tenant_id,user_id,channel,subject_hash,status,verified_at
)
values(
  '60000000-0000-0000-0000-000000000011',
  '30000000-0000-0000-0000-000000000000',
  '50000000-0000-0000-0000-000000000001',
  'whatsapp',
  encode(extensions.digest('gate6-whatsapp-authorized-v1','sha256'),'hex'),
  'active',
  now()
)
on conflict (id) do nothing;
