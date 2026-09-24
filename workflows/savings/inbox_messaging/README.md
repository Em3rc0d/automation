# inbox messaging Savings Workflows

Materialized DESIGN_READY skeletons: **10**

- [MESSAGE_INTAKE_AUTOMATION@0.1](./MESSAGE_INTAKE_AUTOMATION@0.1/) — Message Intake — unit: `message` — runtime: `function`
- [EMAIL_CLASSIFY_ROUTE_AUTOMATION@0.1](./EMAIL_CLASSIFY_ROUTE_AUTOMATION@0.1/) — Email Classification and Routing — unit: `email` — runtime: `function`
- [EMAIL_ATTACHMENT_EXTRACT_AUTOMATION@0.1](./EMAIL_ATTACHMENT_EXTRACT_AUTOMATION@0.1/) — Email Attachment Extraction — unit: `attachment` — runtime: `function`
- [EMAIL_TO_TASK_AUTOMATION@0.1](./EMAIL_TO_TASK_AUTOMATION@0.1/) — Email to Task — unit: `email` — runtime: `function`
- [EMAIL_TO_CRM_AUTOMATION@0.1](./EMAIL_TO_CRM_AUTOMATION@0.1/) — Email to CRM — unit: `email` — runtime: `function`
- [EMAIL_DRAFT_REPLY_AUTOMATION@0.1](./EMAIL_DRAFT_REPLY_AUTOMATION@0.1/) — Email Draft Reply — unit: `email` — runtime: `function`
- [EMAIL_APPROVAL_SEND_AUTOMATION@0.1](./EMAIL_APPROVAL_SEND_AUTOMATION@0.1/) — Email Approval Send — unit: `email` — runtime: `human_loop`
- [UNANSWERED_MESSAGE_WATCHDOG_AUTOMATION@0.1](./UNANSWERED_MESSAGE_WATCHDOG_AUTOMATION@0.1/) — Unanswered Message Watchdog — unit: `thread` — runtime: `scheduled`
- [INBOX_DAILY_DIGEST_AUTOMATION@0.1](./INBOX_DAILY_DIGEST_AUTOMATION@0.1/) — Inbox Daily Digest — unit: `day` — runtime: `scheduled`
- [MESSAGE_THREAD_DEDUPE_AUTOMATION@0.1](./MESSAGE_THREAD_DEDUPE_AUTOMATION@0.1/) — Message Thread Deduplication — unit: `message` — runtime: `function`

Skeletons are not production-certified implementations.
