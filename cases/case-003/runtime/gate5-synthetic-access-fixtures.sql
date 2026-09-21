-- CASE-003 Gate 5 synthetic access-control fixtures.
-- These identities are opaque TEST subjects only. No real phone, email or supplier contact is stored.

insert into case003.external_user(id,tenant_id,display_label,status)
values
('50000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000000','Gate5 Authorized Supplier','active'),
('50000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000000','Gate5 Other Vendor','active'),
('50000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000000','Gate5 No Permission','active')
on conflict (id) do nothing;

insert into case003.external_identity(
  id,tenant_id,user_id,channel,subject_hash,status,verified_at
)
values
(
  '50000000-0000-0000-0000-000000000011',
  '30000000-0000-0000-0000-000000000000',
  '50000000-0000-0000-0000-000000000001',
  'test',
  encode(extensions.digest('gate5-pe10-authorized-v1','sha256'),'hex'),
  'active',now()
),
(
  '50000000-0000-0000-0000-000000000012',
  '30000000-0000-0000-0000-000000000000',
  '50000000-0000-0000-0000-000000000002',
  'test',
  encode(extensions.digest('gate5-other-vendor-v1','sha256'),'hex'),
  'active',now()
),
(
  '50000000-0000-0000-0000-000000000013',
  '30000000-0000-0000-0000-000000000000',
  '50000000-0000-0000-0000-000000000003',
  'test',
  encode(extensions.digest('gate5-no-permission-v1','sha256'),'hex'),
  'active',now()
)
on conflict (id) do nothing;

insert into case003.external_membership(
  id,tenant_id,user_id,supplier_vendor_id,company_code_scope,role_code,status
)
values
(
  '50000000-0000-0000-0000-000000000021',
  '30000000-0000-0000-0000-000000000000',
  '50000000-0000-0000-0000-000000000001',
  '100800070','PE10','supplier_ap_user','active'
),
(
  '50000000-0000-0000-0000-000000000022',
  '30000000-0000-0000-0000-000000000000',
  '50000000-0000-0000-0000-000000000002',
  'SYNTH-OTHER','PE10','supplier_ap_user','active'
),
(
  '50000000-0000-0000-0000-000000000023',
  '30000000-0000-0000-0000-000000000000',
  '50000000-0000-0000-0000-000000000003',
  '100800070','PE10','supplier_ap_user','active'
)
on conflict (id) do nothing;

insert into case003.external_membership_permission(membership_id,permission_code)
values
('50000000-0000-0000-0000-000000000021','invoice.read'),
('50000000-0000-0000-0000-000000000022','invoice.read')
on conflict do nothing;
