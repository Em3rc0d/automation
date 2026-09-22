-- CASE-003 Gate 8 environment binding for the existing Kapso Sandbox WhatsApp configuration.
-- Non-secret provider channel metadata discovered read-only through the existing KAPSO API credential.
insert into case003.channel_connector_binding(
  id,tenant_id,provider,channel,provider_channel_key,connector_account_ref,status
)
values(
  '80000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000000',
  'kapso',
  'whatsapp',
  '597907523413541',
  'kapso-sandbox-live',
  'active'
)
on conflict (id) do update set
  tenant_id=excluded.tenant_id,
  provider=excluded.provider,
  channel=excluded.channel,
  provider_channel_key=excluded.provider_channel_key,
  connector_account_ref=excluded.connector_account_ref,
  status=excluded.status,
  updated_at=now();
