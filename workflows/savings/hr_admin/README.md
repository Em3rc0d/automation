# hr admin Savings Workflows

Materialized DESIGN_READY skeletons: **14**

- [CANDIDATE_INTAKE_ADMIN_AUTOMATION@0.1](./CANDIDATE_INTAKE_ADMIN_AUTOMATION@0.1/) — Candidate Intake Administration — unit: `candidate` — runtime: `function`
- [CV_EXTRACT_AUTOMATION@0.1](./CV_EXTRACT_AUTOMATION@0.1/) — CV Data Extraction — unit: `candidate` — runtime: `heavy`
- [INTERVIEW_SCHEDULE_AUTOMATION@0.1](./INTERVIEW_SCHEDULE_AUTOMATION@0.1/) — Interview Scheduling — unit: `interview` — runtime: `durable`
- [NEW_HIRE_VALIDATE_AUTOMATION@0.1](./NEW_HIRE_VALIDATE_AUTOMATION@0.1/) — New Hire Data Validation — unit: `employee` — runtime: `function`
- [USER_ACCOUNT_PROVISION_AUTOMATION@0.1](./USER_ACCOUNT_PROVISION_AUTOMATION@0.1/) — User Account Provisioning — unit: `employee` — runtime: `function`
- [EMPLOYEE_ONBOARDING_CHECKLIST_AUTOMATION@0.1](./EMPLOYEE_ONBOARDING_CHECKLIST_AUTOMATION@0.1/) — Employee Onboarding Checklist — unit: `employee` — runtime: `function`
- [POLICY_ACKNOWLEDGEMENT_AUTOMATION@0.1](./POLICY_ACKNOWLEDGEMENT_AUTOMATION@0.1/) — Policy Acknowledgement Tracking — unit: `employee` — runtime: `scheduled`
- [TRAINING_REMINDER_AUTOMATION@0.1](./TRAINING_REMINDER_AUTOMATION@0.1/) — Training Reminder — unit: `employee` — runtime: `scheduled`
- [LEAVE_REQUEST_AUTOMATION@0.1](./LEAVE_REQUEST_AUTOMATION@0.1/) — Leave Request Intake — unit: `request` — runtime: `function`
- [LEAVE_APPROVAL_AUTOMATION@0.1](./LEAVE_APPROVAL_AUTOMATION@0.1/) — Leave Approval Routing — unit: `request` — runtime: `human_loop`
- [OFFBOARDING_TRIGGER_AUTOMATION@0.1](./OFFBOARDING_TRIGGER_AUTOMATION@0.1/) — Offboarding Trigger — unit: `employee` — runtime: `function`
- [ACCESS_REVOKE_AUTOMATION@0.1](./ACCESS_REVOKE_AUTOMATION@0.1/) — Access Revocation — unit: `employee` — runtime: `function`
- [OFFBOARDING_AUDIT_AUTOMATION@0.1](./OFFBOARDING_AUDIT_AUTOMATION@0.1/) — Offboarding Audit — unit: `employee` — runtime: `scheduled`
- [EMPLOYEE_DOC_EXPIRY_AUTOMATION@0.1](./EMPLOYEE_DOC_EXPIRY_AUTOMATION@0.1/) — Employee Document Expiry Alert — unit: `document` — runtime: `scheduled`

Skeletons are not production-certified implementations.
