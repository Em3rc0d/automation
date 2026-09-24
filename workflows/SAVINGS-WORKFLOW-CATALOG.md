# Savings Workflow Catalog

Status: **DESIGN-READY CATALOG — NOT PRODUCTION CERTIFIED**  
Updated: 2026-09-24

This catalog lists customer-facing, installable workflows whose purpose is to reduce repetitive human active work. It is intentionally distinct from the provider-neutral capability library.

## Economic invariant

- pre-revenue fixed production infrastructure target: **approximately S/0**;
- no dedicated always-on runtime per customer by default;
- a new customer should normally add configuration and metered usage, not a new server;
- external API/AI/WhatsApp/OCR costs are client-owned where practical or metered/contractually separated;
- every commercial workflow must map to a measurable Savings Engine unit;
- infrastructure complexity is absorbed by the platform, not exposed to the customer.

## Certification warning

Every row below is `DESIGN_READY`, not `TESTED` and not `APPROVED_BASELINE`. The repository must not claim production readiness until the workflow passes the quarry/factory gates, provider/tenant tests and client acceptance.

## Runtime profiles

- **function** — short event/request-driven work.
- **scheduled** — cron/timer work in a shared runtime.
- **durable** — waiting/retry orchestration without a dedicated tenant server.
- **human_loop** — durable workflow with explicit approval/review.
- **heavy** — OCR/batch/compute-intensive work; metered separately when needed.

## Catalog (233 workflows)

### sales leads

| ID | Workflow | Human active work reduced | Savings unit | Runtime |
|---|---|---|---|---|
| SWF-001 | `LEAD_INTAKE_AUTOMATION@0.1` — Lead Intake Automation | Read inbound leads from forms/email/WhatsApp/ads and register them | lead | function |
| SWF-002 | `LEAD_NORMALIZE_AUTOMATION@0.1` — Lead Normalization | Clean and standardize name, phone, email, company and source | lead | function |
| SWF-003 | `LEAD_DEDUPE_AUTOMATION@0.1` — Lead Deduplication | Search existing records before creating a duplicate | lead | function |
| SWF-004 | `LEAD_CRM_UPSERT_AUTOMATION@0.1` — Lead to CRM | Copy or update lead data in the CRM/database | lead | function |
| SWF-005 | `LEAD_ROUTE_AUTOMATION@0.1` — Lead Assignment | Choose and assign the responsible salesperson by rules | lead | function |
| SWF-006 | `LEAD_ACKNOWLEDGE_AUTOMATION@0.1` — Immediate Lead Acknowledgement | Write and send the first acknowledgement to a new lead | lead | function |
| SWF-007 | `LEAD_OWNER_NOTIFY_AUTOMATION@0.1` — Lead Owner Notification | Notify the assigned owner with the useful lead context | lead | function |
| SWF-008 | `LEAD_SLA_WATCHDOG_AUTOMATION@0.1` — Lead SLA Watchdog | Review leads with no action inside the agreed SLA | lead reviewed | scheduled |
| SWF-009 | `LEAD_FOLLOWUP_AUTOMATION@0.1` — Lead Follow-up | Review pending leads and send configured follow-ups | follow-up | durable |
| SWF-010 | `LEAD_REACTIVATION_AUTOMATION@0.1` — Dormant Lead Reactivation | Find dormant/lost leads and re-engage them under policy | lead | scheduled |
| SWF-011 | `LEAD_TO_APPOINTMENT_AUTOMATION@0.1` — Lead to Appointment | Coordinate a booking after qualification | appointment | durable |

### appointments

| ID | Workflow | Human active work reduced | Savings unit | Runtime |
|---|---|---|---|---|
| SWF-012 | `APPOINTMENT_REQUEST_AUTOMATION@0.1` — Appointment Request Intake | Read a booking request and normalize required fields | request | function |
| SWF-013 | `AVAILABILITY_REPLY_AUTOMATION@0.1` — Availability Reply | Check calendar availability and return valid slots | request | function |
| SWF-014 | `APPOINTMENT_BOOK_AUTOMATION@0.1` — Appointment Booking | Create the chosen appointment without manual calendar entry | appointment | function |
| SWF-015 | `APPOINTMENT_CONFIRM_AUTOMATION@0.1` — Appointment Confirmation | Send confirmations after a successful booking | appointment | function |
| SWF-016 | `APPOINTMENT_REMINDER_AUTOMATION@0.1` — Appointment Reminder | Review upcoming appointments and remind attendees | reminder | scheduled |
| SWF-017 | `APPOINTMENT_RESCHEDULE_AUTOMATION@0.1` — Appointment Reschedule | Find a new slot, update calendar and confirm the change | reschedule | durable |
| SWF-018 | `APPOINTMENT_CANCEL_AUTOMATION@0.1` — Appointment Cancellation | Cancel the event and synchronize the resulting state | cancellation | function |
| SWF-019 | `WAITLIST_FILL_AUTOMATION@0.1` — Waitlist Fill | Detect released slots and contact eligible waiting customers | slot | scheduled |
| SWF-020 | `NO_SHOW_RECOVERY_AUTOMATION@0.1` — No-show Recovery | Detect missed appointments and trigger a recovery sequence | no-show | scheduled |
| SWF-021 | `POST_VISIT_FOLLOWUP_AUTOMATION@0.1` — Post-visit Follow-up | Send the configured post-service follow-up | visit | scheduled |

### quotes contracts

| ID | Workflow | Human active work reduced | Savings unit | Runtime |
|---|---|---|---|---|
| SWF-022 | `QUOTE_REQUEST_AUTOMATION@0.1` — Quote Request Intake | Convert inbound quotation requests into structured quote data | quote request | function |
| SWF-023 | `QUOTE_PREPARE_AUTOMATION@0.1` — Quote Preparation | Look up product/service data and calculate a proposed quote deterministically | quote | function |
| SWF-024 | `QUOTE_DOCUMENT_AUTOMATION@0.1` — Quote Document Generation | Create the quote document from approved templates | document | function |
| SWF-025 | `QUOTE_APPROVAL_AUTOMATION@0.1` — Quote Exception Approval | Detect discount/margin exceptions and route approval | approval | human_loop |
| SWF-026 | `QUOTE_DELIVERY_AUTOMATION@0.1` — Quote Delivery | Send the approved quote through the configured channel | quote | function |
| SWF-027 | `QUOTE_FOLLOWUP_AUTOMATION@0.1` — Quote Follow-up | Review pending quotes and contact customers on schedule | quote | scheduled |
| SWF-028 | `QUOTE_OUTCOME_CAPTURE_AUTOMATION@0.1` — Quote Outcome Capture | Capture accepted/rejected/pending state from customer responses | quote | function |
| SWF-029 | `PROPOSAL_GENERATION_AUTOMATION@0.1` — Proposal Generation | Build a proposal from structured commercial inputs and templates | proposal | function |
| SWF-030 | `CONTRACT_FROM_TEMPLATE_AUTOMATION@0.1` — Contract from Template | Populate an approved contract template from customer/deal data | contract | function |
| SWF-031 | `CONTRACT_REVIEW_GATE_AUTOMATION@0.1` — Contract Review Gate | Route contracts that require human/legal review | contract | human_loop |
| SWF-032 | `ESIGN_SEND_AUTOMATION@0.1` — E-sign Send | Prepare and send the signature request | contract | function |
| SWF-033 | `ESIGN_STATUS_AUTOMATION@0.1` — E-sign Status Sync | Check signature status and synchronize the result | contract | scheduled |
| SWF-034 | `CUSTOMER_CREATE_FROM_WIN_AUTOMATION@0.1` — Won Deal to Customer | Create customer records after a confirmed sale | customer | function |
| SWF-035 | `DEPOSIT_REQUEST_AUTOMATION@0.1` — Deposit Request | Create and send the configured deposit request | deposit | function |
| SWF-036 | `INVOICE_FROM_WIN_AUTOMATION@0.1` — Invoice from Win | Create the invoice/request after a confirmed sale | invoice | function |
| SWF-037 | `PAYMENT_LINK_AUTOMATION@0.1` — Payment Link Creation | Generate and send a payment link without manual portal work | payment request | function |

### accounts receivable

| ID | Workflow | Human active work reduced | Savings unit | Runtime |
|---|---|---|---|---|
| SWF-038 | `AR_OPEN_INVOICE_IMPORT_AUTOMATION@0.1` — Open Invoice Import | Import open receivables from the source system | invoice | scheduled |
| SWF-039 | `AR_AGING_AUTOMATION@0.1` — AR Aging Calculation | Calculate days outstanding and aging buckets | invoice | scheduled |
| SWF-040 | `PAYMENT_REMINDER_AUTOMATION@0.1` — Payment Reminder | Identify due/overdue invoices and send configured reminders | invoice | scheduled |
| SWF-041 | `PAYMENT_ESCALATION_AUTOMATION@0.1` — Payment Escalation | Move overdue invoices through configured collection tiers | invoice | durable |
| SWF-042 | `PAYMENT_RECEIVED_SYNC_AUTOMATION@0.1` — Payment Received Sync | Update receivable state after payment is detected | payment | function |
| SWF-043 | `PAYMENT_RECONCILIATION_AUTOMATION@0.1` — Payment Reconciliation | Match received payments to outstanding invoices | payment | function |
| SWF-044 | `COLLECTION_OWNER_ALERT_AUTOMATION@0.1` — Collection Owner Alert | Alert the owner only for cases that need human collection work | invoice | scheduled |
| SWF-045 | `AR_WEEKLY_SUMMARY_AUTOMATION@0.1` — AR Weekly Summary | Compile weekly receivables and collection exceptions | report | scheduled |
| SWF-046 | `DISPUTE_INTAKE_AUTOMATION@0.1` — Invoice Dispute Intake | Register and route a customer payment/invoice dispute | dispute | function |

### supplier self service

| ID | Workflow | Human active work reduced | Savings unit | Runtime |
|---|---|---|---|---|
| SWF-047 | `SUPPLIER_INVOICE_STATUS_AUTOMATION@0.1` — Supplier Invoice Status Self-service | Look up invoice status and answer the supplier without back-office lookup | query | function |
| SWF-048 | `SUPPLIER_PAYMENT_STATUS_AUTOMATION@0.1` — Supplier Payment Status Self-service | Look up payment/due state and answer the supplier | query | function |
| SWF-049 | `SUPPLIER_PO_STATUS_AUTOMATION@0.1` — Supplier PO Status Self-service | Look up purchase-order state and answer the supplier | query | function |
| SWF-050 | `SUPPLIER_RECEIPT_STATUS_AUTOMATION@0.1` — Supplier Receipt Status Self-service | Check whether goods/services have been received and report the state | query | function |
| SWF-051 | `SUPPLIER_STATUS_CHANGE_NOTIFY_AUTOMATION@0.1` — Supplier Status Change Notification | Detect important status changes and notify the supplier proactively | status change | scheduled |
| SWF-052 | `SUPPLIER_DOCUMENT_INTAKE_AUTOMATION@0.1` — Supplier Document Intake | Receive supplier documents and attach them to the right process | document | function |
| SWF-053 | `SUPPLIER_IDENTITY_VERIFY_AUTOMATION@0.1` — Supplier Identity Verification | Verify supplier identity before revealing protected status information | verification | human_loop |
| SWF-054 | `SUPPLIER_ACCESS_REQUEST_AUTOMATION@0.1` — Additional Supplier Access Request | Route requests for new authorized supplier contacts | access request | human_loop |
| SWF-055 | `SUPPLIER_EXCEPTION_HANDOFF_AUTOMATION@0.1` — Supplier Exception Handoff | Create a human task only when the self-service flow cannot safely resolve the request | exception | human_loop |

### accounts payable documents

| ID | Workflow | Human active work reduced | Savings unit | Runtime |
|---|---|---|---|---|
| SWF-056 | `INVOICE_EMAIL_INTAKE_AUTOMATION@0.1` — Invoice Email Intake | Download invoice attachments and register the source message | document | function |
| SWF-057 | `DOCUMENT_CLASSIFY_AUTOMATION@0.1` — Document Classification | Open incoming documents and determine the correct document type | document | function |
| SWF-058 | `INVOICE_OCR_AUTOMATION@0.1` — Invoice OCR Extraction | Extract invoice fields instead of manual typing | invoice | heavy |
| SWF-059 | `RECEIPT_OCR_AUTOMATION@0.1` — Receipt OCR Extraction | Extract receipt fields instead of manual typing | receipt | heavy |
| SWF-060 | `ACCOUNTING_NORMALIZE_AUTOMATION@0.1` — Accounting Document Normalization | Transform extracted fields to the accounting contract | document | function |
| SWF-061 | `INVOICE_ARITHMETIC_VALIDATE_AUTOMATION@0.1` — Invoice Arithmetic Validation | Check subtotal/tax/discount/total arithmetic automatically | invoice | function |
| SWF-062 | `INVOICE_DUPLICATE_DETECT_AUTOMATION@0.1` — Invoice Duplicate Detection | Detect duplicate invoices before posting | invoice | function |
| SWF-063 | `VENDOR_VALIDATE_AUTOMATION@0.1` — Vendor Validation | Compare invoice vendor data against the approved vendor master | invoice | function |
| SWF-064 | `PO_MATCH_AUTOMATION@0.1` — PO Match | Compare invoice data against the purchase order | invoice | function |
| SWF-065 | `THREE_WAY_MATCH_AUTOMATION@0.1` — Three-way Match | Compare PO, receipt and invoice before payment | invoice | function |
| SWF-066 | `INVOICE_APPROVAL_ROUTE_AUTOMATION@0.1` — Invoice Approval Routing | Find the correct approver and route only exceptions | invoice | human_loop |
| SWF-067 | `ACCOUNTING_EXPORT_AUTOMATION@0.1` — Accounting Export | Push validated accounting data to the target system/file | document | function |
| SWF-068 | `DOCUMENT_ARCHIVE_AUTOMATION@0.1` — Document Archive | Rename and store the final document automatically | document | function |
| SWF-069 | `DOCUMENT_EXCEPTION_REVIEW_AUTOMATION@0.1` — Document Exception Review | Create a review task only for low-confidence or inconsistent documents | exception | human_loop |
| SWF-070 | `CPE_VALIDATE_PERU_AUTOMATION@0.1` — Peru CPE Validation | Validate configured electronic-receipt facts against the authoritative regional source | document | function |

### expenses

| ID | Workflow | Human active work reduced | Savings unit | Runtime |
|---|---|---|---|---|
| SWF-071 | `EXPENSE_SUBMIT_AUTOMATION@0.1` — Expense Submission Intake | Receive and structure employee expense submissions | expense | function |
| SWF-072 | `EXPENSE_RECEIPT_EXTRACT_AUTOMATION@0.1` — Expense Receipt Extraction | Extract receipt fields instead of manual typing | expense | heavy |
| SWF-073 | `EXPENSE_POLICY_CHECK_AUTOMATION@0.1` — Expense Policy Check | Evaluate routine policy rules automatically | expense | function |
| SWF-074 | `EXPENSE_DUPLICATE_CHECK_AUTOMATION@0.1` — Expense Duplicate Check | Detect repeated receipts/claims | expense | function |
| SWF-075 | `EXPENSE_AUTO_APPROVE_AUTOMATION@0.1` — Expense Auto-approval | Auto-approve only claims that satisfy explicit policy | expense | function |
| SWF-076 | `EXPENSE_MANAGER_APPROVAL_AUTOMATION@0.1` — Expense Manager Approval | Route exceptions to the correct manager | expense | human_loop |
| SWF-077 | `EXPENSE_REGISTER_AUTOMATION@0.1` — Expense Registration | Register approved expense data in the target system | expense | function |
| SWF-078 | `EXPENSE_REIMBURSEMENT_STATUS_AUTOMATION@0.1` — Reimbursement Status Self-service | Answer employee reimbursement-status queries from source data | query | function |
| SWF-079 | `EXPENSE_MONTHLY_REPORT_AUTOMATION@0.1` — Expense Monthly Report | Compile monthly expense totals/exceptions automatically | report | scheduled |

### procurement

| ID | Workflow | Human active work reduced | Savings unit | Runtime |
|---|---|---|---|---|
| SWF-080 | `PURCHASE_REQUEST_AUTOMATION@0.1` — Purchase Request Intake | Register procurement requests from form/email/chat | request | function |
| SWF-081 | `PURCHASE_REQUEST_VALIDATE_AUTOMATION@0.1` — Purchase Request Validation | Check required fields and documents | request | function |
| SWF-082 | `PURCHASE_APPROVAL_ROUTE_AUTOMATION@0.1` — Purchase Approval Routing | Find the right approver from amount/area/rules | request | human_loop |
| SWF-083 | `BUDGET_CHECK_AUTOMATION@0.1` — Budget Check | Look up available budget before routing the purchase | request | function |
| SWF-084 | `SUPPLIER_SELECT_AUTOMATION@0.1` — Supplier Selection Support | Apply configured supplier-selection rules to routine requests | request | human_loop |
| SWF-085 | `PO_GENERATE_AUTOMATION@0.1` — Purchase Order Generation | Create a PO document/record from an approved request | purchase order | function |
| SWF-086 | `PO_APPROVE_AUTOMATION@0.1` — Purchase Order Approval | Route high-risk/high-value PO approval | purchase order | human_loop |
| SWF-087 | `PO_SEND_AUTOMATION@0.1` — Purchase Order Send | Send the approved PO to the selected supplier | purchase order | function |
| SWF-088 | `PO_STATUS_TRACK_AUTOMATION@0.1` — Purchase Order Status Tracking | Monitor open POs and surface overdue items | purchase order | scheduled |
| SWF-089 | `GOODS_RECEIPT_CAPTURE_AUTOMATION@0.1` — Goods Receipt Capture | Register a confirmed receipt from a structured source | receipt | function |
| SWF-090 | `SUPPLIER_RISK_ALERT_AUTOMATION@0.1` — Supplier Risk Alert | Check configured supplier-risk sources and alert only on relevant changes | supplier | scheduled |

### orders inventory

| ID | Workflow | Human active work reduced | Savings unit | Runtime |
|---|---|---|---|---|
| SWF-091 | `ORDER_INGEST_AUTOMATION@0.1` — Order Intake | Capture orders from commerce/chat/email into one process | order | function |
| SWF-092 | `ORDER_NORMALIZE_AUTOMATION@0.1` — Order Normalization | Normalize customer, SKU, quantity and delivery fields | order | function |
| SWF-093 | `ORDER_CUSTOMER_UPSERT_AUTOMATION@0.1` — Order Customer Upsert | Create/update the order customer automatically | order | function |
| SWF-094 | `INVENTORY_CHECK_AUTOMATION@0.1` — Inventory Check | Look up stock before confirming an order | order | function |
| SWF-095 | `INVENTORY_RESERVE_AUTOMATION@0.1` — Inventory Reservation | Reserve eligible stock without manual inventory action | order | function |
| SWF-096 | `INVENTORY_SYNC_AUTOMATION@0.1` — Inventory Synchronization | Synchronize stock changes between systems | inventory movement | function |
| SWF-097 | `LOW_STOCK_ALERT_AUTOMATION@0.1` — Low Stock Alert | Review stock levels and notify only below configured thresholds | SKU | scheduled |
| SWF-098 | `REORDER_RECOMMEND_AUTOMATION@0.1` — Reorder Recommendation | Identify SKUs needing replenishment from configured rules | SKU | scheduled |
| SWF-099 | `FULFILLMENT_ROUTE_AUTOMATION@0.1` — Fulfillment Routing | Assign the order to the correct warehouse/team | order | function |
| SWF-100 | `ORDER_STATUS_NOTIFY_AUTOMATION@0.1` — Order Status Notification | Notify customers on meaningful order-state changes | status change | function |
| SWF-101 | `SHIPPING_TRACK_SYNC_AUTOMATION@0.1` — Shipping Tracking Sync | Poll/receive carrier state and update customer/order records | shipment | scheduled |
| SWF-102 | `RETURN_REQUEST_AUTOMATION@0.1` — Return Request Intake | Register and validate a return request | return | function |
| SWF-103 | `REFUND_APPROVAL_AUTOMATION@0.1` — Refund Approval | Route refund exceptions for approval | refund | human_loop |
| SWF-104 | `POST_PURCHASE_FOLLOWUP_AUTOMATION@0.1` — Post-purchase Follow-up | Send configured follow-up after delivery | order | scheduled |
| SWF-105 | `ABANDONED_CART_FOLLOWUP_AUTOMATION@0.1` — Abandoned Cart Follow-up | Detect eligible abandoned carts and follow up | cart | scheduled |

### support

| ID | Workflow | Human active work reduced | Savings unit | Runtime |
|---|---|---|---|---|
| SWF-106 | `SUPPORT_INTAKE_AUTOMATION@0.1` — Support Intake | Capture requests from email/chat/forms into a normalized support process | ticket | function |
| SWF-107 | `TICKET_DEDUPE_AUTOMATION@0.1` — Ticket Deduplication | Detect repeated requests before creating duplicate tickets | ticket | function |
| SWF-108 | `TICKET_CLASSIFY_AUTOMATION@0.1` — Ticket Classification | Read the request and classify category/product/topic | ticket | function |
| SWF-109 | `TICKET_PRIORITY_AUTOMATION@0.1` — Ticket Prioritization | Apply explicit urgency/SLA rules | ticket | function |
| SWF-110 | `TICKET_CREATE_AUTOMATION@0.1` — Ticket Creation | Create the helpdesk ticket without retyping the request | ticket | function |
| SWF-111 | `TICKET_ROUTE_AUTOMATION@0.1` — Ticket Routing | Assign the ticket to the correct queue/owner | ticket | function |
| SWF-112 | `SLA_WATCHDOG_AUTOMATION@0.1` — Support SLA Watchdog | Review aging tickets and surface breaches before manual checking | ticket | scheduled |
| SWF-113 | `KB_RETRIEVE_AUTOMATION@0.1` — Support Knowledge Lookup | Retrieve relevant approved knowledge for a support request | query | function |
| SWF-114 | `SUPPORT_DRAFT_REPLY_AUTOMATION@0.1` — Support Draft Reply | Prepare a response draft for repetitive support questions | ticket | function |
| SWF-115 | `SUPPORT_APPROVAL_SEND_AUTOMATION@0.1` — Support Human-approved Send | Route sensitive outbound replies to approval then send | ticket | human_loop |
| SWF-116 | `SUPPORT_ESCALATE_AUTOMATION@0.1` — Support Escalation | Escalate only cases matching configured conditions | ticket | function |
| SWF-117 | `TICKET_CLOSE_SYNC_AUTOMATION@0.1` — Ticket Close Sync | Synchronize resolved/closed state across systems | ticket | function |
| SWF-118 | `POST_TICKET_SURVEY_AUTOMATION@0.1` — Post-ticket Survey | Send a feedback request after ticket closure | ticket | scheduled |

### client onboarding

| ID | Workflow | Human active work reduced | Savings unit | Runtime |
|---|---|---|---|---|
| SWF-119 | `CLIENT_RECORD_CREATE_AUTOMATION@0.1` — Client Record Creation | Create the customer record after a confirmed win | client | function |
| SWF-120 | `CLIENT_FOLDER_CREATE_AUTOMATION@0.1` — Client Folder Creation | Create the standard client folder structure | client | function |
| SWF-121 | `CLIENT_PROJECT_CREATE_AUTOMATION@0.1` — Client Project Creation | Create the delivery project/workspace | client | function |
| SWF-122 | `CLIENT_TASK_CHECKLIST_AUTOMATION@0.1` — Client Onboarding Checklist | Generate standard onboarding tasks | client | function |
| SWF-123 | `CLIENT_CONTRACT_START_AUTOMATION@0.1` — Client Contract Start | Kick off the configured contract-generation/signature path | client | durable |
| SWF-124 | `CLIENT_INITIAL_INVOICE_AUTOMATION@0.1` — Client Initial Invoice | Create the initial billing action after onboarding gates pass | client | function |
| SWF-125 | `CLIENT_ACCESS_REQUESTS_AUTOMATION@0.1` — Client Access Requests | Request required credentials/accesses from the client | client | durable |
| SWF-126 | `CLIENT_WELCOME_MESSAGE_AUTOMATION@0.1` — Client Welcome Message | Send the standard welcome packet/message | client | function |
| SWF-127 | `KICKOFF_SCHEDULE_AUTOMATION@0.1` — Kickoff Scheduling | Coordinate the initial project meeting | client | durable |
| SWF-128 | `ONBOARDING_STAGE_WATCHDOG_AUTOMATION@0.1` — Onboarding Stage Watchdog | Detect blocked/stale onboarding stages | client | scheduled |
| SWF-129 | `CLIENT_HANDOFF_COMPLETE_AUTOMATION@0.1` — Client Handoff Completion | Complete the configured handoff to steady-state service | client | function |

### hr admin

| ID | Workflow | Human active work reduced | Savings unit | Runtime |
|---|---|---|---|---|
| SWF-130 | `CANDIDATE_INTAKE_ADMIN_AUTOMATION@0.1` — Candidate Intake Administration | Capture candidate documents/data without making hiring decisions | candidate | function |
| SWF-131 | `CV_EXTRACT_AUTOMATION@0.1` — CV Data Extraction | Extract administrative CV fields instead of manual typing | candidate | heavy |
| SWF-132 | `INTERVIEW_SCHEDULE_AUTOMATION@0.1` — Interview Scheduling | Coordinate available times between candidate and interviewer | interview | durable |
| SWF-133 | `NEW_HIRE_VALIDATE_AUTOMATION@0.1` — New Hire Data Validation | Check required onboarding fields/documents | employee | function |
| SWF-134 | `USER_ACCOUNT_PROVISION_AUTOMATION@0.1` — User Account Provisioning | Create configured accounts for a new hire | employee | function |
| SWF-135 | `EMPLOYEE_ONBOARDING_CHECKLIST_AUTOMATION@0.1` — Employee Onboarding Checklist | Create standard onboarding tasks/access requests | employee | function |
| SWF-136 | `POLICY_ACKNOWLEDGEMENT_AUTOMATION@0.1` — Policy Acknowledgement Tracking | Track missing policy acknowledgements and remind | employee | scheduled |
| SWF-137 | `TRAINING_REMINDER_AUTOMATION@0.1` — Training Reminder | Find overdue training items and remind employees | employee | scheduled |
| SWF-138 | `LEAVE_REQUEST_AUTOMATION@0.1` — Leave Request Intake | Register employee leave requests | request | function |
| SWF-139 | `LEAVE_APPROVAL_AUTOMATION@0.1` — Leave Approval Routing | Route leave requests to the correct approver and sync result | request | human_loop |
| SWF-140 | `OFFBOARDING_TRIGGER_AUTOMATION@0.1` — Offboarding Trigger | Start the standard offboarding sequence | employee | function |
| SWF-141 | `ACCESS_REVOKE_AUTOMATION@0.1` — Access Revocation | Revoke configured accounts/accesses during offboarding | employee | function |
| SWF-142 | `OFFBOARDING_AUDIT_AUTOMATION@0.1` — Offboarding Audit | Verify the required offboarding actions are complete | employee | scheduled |
| SWF-143 | `EMPLOYEE_DOC_EXPIRY_AUTOMATION@0.1` — Employee Document Expiry Alert | Review employee document expirations and alert | document | scheduled |

### inbox messaging

| ID | Workflow | Human active work reduced | Savings unit | Runtime |
|---|---|---|---|---|
| SWF-144 | `MESSAGE_INTAKE_AUTOMATION@0.1` — Message Intake | Capture and normalize inbound business messages | message | function |
| SWF-145 | `EMAIL_CLASSIFY_ROUTE_AUTOMATION@0.1` — Email Classification and Routing | Classify and route incoming email automatically | email | function |
| SWF-146 | `EMAIL_ATTACHMENT_EXTRACT_AUTOMATION@0.1` — Email Attachment Extraction | Download and attach relevant files to the right process | attachment | function |
| SWF-147 | `EMAIL_TO_TASK_AUTOMATION@0.1` — Email to Task | Turn actionable email into a task without retyping | email | function |
| SWF-148 | `EMAIL_TO_CRM_AUTOMATION@0.1` — Email to CRM | Register relevant email/contact activity in CRM | email | function |
| SWF-149 | `EMAIL_DRAFT_REPLY_AUTOMATION@0.1` — Email Draft Reply | Prepare repetitive response drafts | email | function |
| SWF-150 | `EMAIL_APPROVAL_SEND_AUTOMATION@0.1` — Email Approval Send | Route sensitive drafts for approval and then send | email | human_loop |
| SWF-151 | `UNANSWERED_MESSAGE_WATCHDOG_AUTOMATION@0.1` — Unanswered Message Watchdog | Find conversations with no response inside SLA | thread | scheduled |
| SWF-152 | `INBOX_DAILY_DIGEST_AUTOMATION@0.1` — Inbox Daily Digest | Summarize relevant inbox items into one daily brief | day | scheduled |
| SWF-153 | `MESSAGE_THREAD_DEDUPE_AUTOMATION@0.1` — Message Thread Deduplication | Avoid duplicate processing of the same conversation/event | message | function |

### documents knowledge

| ID | Workflow | Human active work reduced | Savings unit | Runtime |
|---|---|---|---|---|
| SWF-154 | `FILE_INGEST_AUTOMATION@0.1` — File Intake | Collect files from configured sources into one processing path | file | function |
| SWF-155 | `FILE_MIME_VALIDATE_AUTOMATION@0.1` — File Type Validation | Validate supported file types automatically | file | function |
| SWF-156 | `OCR_EXTRACT_AUTOMATION@0.1` — OCR Extraction | Extract text from scans/images instead of manual transcription | document | heavy |
| SWF-157 | `STRUCTURED_FIELD_EXTRACT_AUTOMATION@0.1` — Structured Field Extraction | Extract target fields into a typed schema | document | heavy |
| SWF-158 | `DOCUMENT_RENAME_AUTOMATION@0.1` — Document Renaming | Rename files using deterministic business rules | file | function |
| SWF-159 | `DOCUMENT_ROUTE_FOLDER_AUTOMATION@0.1` — Document Folder Routing | Move/store documents in the correct location | document | function |
| SWF-160 | `DOCUMENT_DEADLINE_EXTRACT_AUTOMATION@0.1` — Document Deadline Extraction | Extract important dates from documents | document | heavy |
| SWF-161 | `DOCUMENT_EXPIRY_ALERT_AUTOMATION@0.1` — Document Expiry Alert | Review future expirations and alert owners | document | scheduled |
| SWF-162 | `DOCUMENT_INDEX_AUTOMATION@0.1` — Document Indexing | Register searchable metadata automatically | document | function |
| SWF-163 | `DOCUMENT_TO_RAG_AUTOMATION@0.1` — Knowledge Ingestion | Prepare approved documents for searchable knowledge retrieval | document | heavy |
| SWF-164 | `RAG_ANSWER_AUTOMATION@0.1` — Knowledge Q&A with Evidence | Retrieve an answer with source evidence instead of manual document search | query | function |

### feedback retention

| ID | Workflow | Human active work reduced | Savings unit | Runtime |
|---|---|---|---|---|
| SWF-165 | `FEEDBACK_REQUEST_AUTOMATION@0.1` — Feedback Request | Send feedback requests after configured business events | customer | scheduled |
| SWF-166 | `FEEDBACK_CAPTURE_AUTOMATION@0.1` — Feedback Capture | Register survey/review responses | response | function |
| SWF-167 | `NPS_CSAT_SCORE_AUTOMATION@0.1` — NPS/CSAT Calculation | Calculate configured feedback metrics | response | function |
| SWF-168 | `FEEDBACK_CLASSIFY_AUTOMATION@0.1` — Feedback Classification | Categorize free-text feedback for operations | response | function |
| SWF-169 | `DETRACTOR_ALERT_AUTOMATION@0.1` — Detractor Alert | Surface dissatisfied customers without manual review | response | function |
| SWF-170 | `POSITIVE_REVIEW_REQUEST_AUTOMATION@0.1` — Positive Review Request | Ask eligible satisfied customers for a public review | customer | scheduled |
| SWF-171 | `RETENTION_FOLLOWUP_AUTOMATION@0.1` — Retention Follow-up | Follow up configured retention-risk cases | customer | scheduled |
| SWF-172 | `RENEWAL_REMINDER_AUTOMATION@0.1` — Renewal Reminder | Find upcoming renewals and start the renewal process | contract | scheduled |
| SWF-173 | `REACTIVATION_CAMPAIGN_AUTOMATION@0.1` — Customer Reactivation | Find eligible inactive customers and contact them | customer | scheduled |

### reporting

| ID | Workflow | Human active work reduced | Savings unit | Runtime |
|---|---|---|---|---|
| SWF-174 | `DATA_AGGREGATE_AUTOMATION@0.1` — Data Aggregation | Collect recurring operational data from source systems | report run | scheduled |
| SWF-175 | `KPI_CALCULATE_AUTOMATION@0.1` — KPI Calculation | Calculate recurring KPIs deterministically | report run | scheduled |
| SWF-176 | `TREND_CALCULATE_AUTOMATION@0.1` — Trend Calculation | Calculate period-over-period trends | report run | scheduled |
| SWF-177 | `THRESHOLD_ALERT_AUTOMATION@0.1` — Threshold Alert | Monitor metrics and alert only when thresholds are crossed | metric check | scheduled |
| SWF-178 | `ANOMALY_REVIEW_AUTOMATION@0.1` — Anomaly Review Queue | Surface anomalous cases for human review instead of manual scanning | metric check | scheduled |
| SWF-179 | `DAILY_EXECUTIVE_BRIEF_AUTOMATION@0.1` — Daily Executive Brief | Build and deliver a daily operational brief | day | scheduled |
| SWF-180 | `WEEKLY_EXECUTIVE_BRIEF_AUTOMATION@0.1` — Weekly Executive Brief | Build and deliver a weekly management brief | week | scheduled |
| SWF-181 | `FINANCE_HEALTH_REPORT_AUTOMATION@0.1` — Finance Health Report | Compile finance status and exceptions automatically | report | scheduled |
| SWF-182 | `OPS_HEALTH_REPORT_AUTOMATION@0.1` — Operations Health Report | Compile operations volume/SLA/exceptions automatically | report | scheduled |

### data sync it

| ID | Workflow | Human active work reduced | Savings unit | Runtime |
|---|---|---|---|---|
| SWF-183 | `ENTITY_SYNC_ONE_WAY_AUTOMATION@0.1` — One-way Entity Sync | Copy approved entity changes from source to destination | entity | function |
| SWF-184 | `ENTITY_SYNC_BIDIRECTIONAL_AUTOMATION@0.1` — Bidirectional Entity Sync | Synchronize approved fields in both directions | entity | durable |
| SWF-185 | `FIELD_MAP_TRANSFORM_AUTOMATION@0.1` — Field Mapping Transform | Transform fields between system schemas | entity | function |
| SWF-186 | `MASTER_DATA_DEDUPE_AUTOMATION@0.1` — Master Data Deduplication | Find duplicate master records | record | scheduled |
| SWF-187 | `MASTER_DATA_ENRICH_AUTOMATION@0.1` — Master Data Enrichment | Add configured data from approved sources | record | function |
| SWF-188 | `SYNC_CONFLICT_QUEUE_AUTOMATION@0.1` — Sync Conflict Queue | Create human tasks only for conflicting updates | conflict | human_loop |
| SWF-189 | `BACKFILL_IMPORT_AUTOMATION@0.1` — Backfill Import | Bulk-import historical records using validated mappings | record | heavy |
| SWF-190 | `EXPORT_BATCH_AUTOMATION@0.1` — Batch Export | Generate scheduled exports without manual downloads | batch | scheduled |
| SWF-191 | `DATA_QUALITY_CHECK_AUTOMATION@0.1` — Data Quality Check | Run recurring completeness/consistency checks | record set | scheduled |
| SWF-192 | `WEBHOOK_EVENT_INGEST_AUTOMATION@0.1` — Webhook Event Intake | Verify/dedupe/store provider events | event | function |
| SWF-193 | `ACCESS_REQUEST_AUTOMATION@0.1` — Access Request Intake | Register internal access requests | request | function |
| SWF-194 | `ACCESS_APPROVAL_AUTOMATION@0.1` — Access Approval Routing | Route access requests to the correct approver | request | human_loop |
| SWF-195 | `ACCOUNT_PROVISION_AUTOMATION@0.1` — Account Provisioning | Provision approved accounts automatically | account | function |
| SWF-196 | `ACCOUNT_DEPROVISION_AUTOMATION@0.1` — Account Deprovisioning | Disable approved accounts automatically | account | function |
| SWF-197 | `CREDENTIAL_EXPIRY_ALERT_AUTOMATION@0.1` — Credential Expiry Alert | Monitor expiring integration credentials | credential | scheduled |
| SWF-198 | `INTEGRATION_HEALTH_CHECK_AUTOMATION@0.1` — Integration Health Check | Check connectors and surface only degraded states | connector | scheduled |

### service operations

| ID | Workflow | Human active work reduced | Savings unit | Runtime |
|---|---|---|---|---|
| SWF-199 | `WORK_REQUEST_INTAKE_AUTOMATION@0.1` — Work Request Intake | Register service/maintenance requests | request | function |
| SWF-200 | `WORK_ORDER_CREATE_AUTOMATION@0.1` — Work Order Creation | Create a work order from an accepted request | work order | function |
| SWF-201 | `WORK_ASSIGN_AUTOMATION@0.1` — Work Assignment | Assign technician/team using configured rules | work order | function |
| SWF-202 | `WORK_STATUS_SYNC_AUTOMATION@0.1` — Work Status Synchronization | Synchronize work status across technician/system/customer | status change | function |
| SWF-203 | `WORK_SLA_WATCHDOG_AUTOMATION@0.1` — Work SLA Watchdog | Monitor overdue work orders | work order | scheduled |
| SWF-204 | `WORK_CUSTOMER_NOTIFY_AUTOMATION@0.1` — Work Customer Notification | Notify customers when relevant work status changes | status change | function |
| SWF-205 | `WORK_COMPLETE_AUTOMATION@0.1` — Work Completion Processing | Close the work order and related records | work order | function |
| SWF-206 | `SERVICE_MAINTENANCE_REMINDER_AUTOMATION@0.1` — Maintenance Reminder | Find upcoming maintenance and contact the customer | asset/customer | scheduled |
| SWF-207 | `TIMESHEET_AGGREGATE_AUTOMATION@0.1` — Timesheet Aggregation | Collect and aggregate reported hours | employee/day | scheduled |
| SWF-208 | `PROJECT_STATUS_BRIEF_AUTOMATION@0.1` — Project Status Brief | Compile project tasks, blockers and status | project | scheduled |

### education

| ID | Workflow | Human active work reduced | Savings unit | Runtime |
|---|---|---|---|---|
| SWF-209 | `STUDENT_REGISTRATION_AUTOMATION@0.1` — Student Registration | Copy enrollment/form/payment data into the student register | student | function |
| SWF-210 | `STUDENT_GROUP_ASSIGNMENT_AUTOMATION@0.1` — Student Group Assignment | Assign students to the configured course/group | student | function |
| SWF-211 | `CLASS_REMINDER_AUTOMATION@0.1` — Class Reminder | Review the schedule and remind the right students | student/class | scheduled |
| SWF-212 | `CLASS_ATTENDANCE_AUTOMATION@0.1` — Class Attendance Registration | Convert attendance/meeting records into the attendance register | student/class | function |
| SWF-213 | `CLASS_MATERIAL_DELIVERY_AUTOMATION@0.1` — Post-class Material Delivery | Send the correct material to the correct group after class | class | durable |
| SWF-214 | `CLASS_RECORDING_DELIVERY_AUTOMATION@0.1` — Class Recording Delivery | Send the recording link to the correct group | class | durable |
| SWF-215 | `CLASS_MATERIAL_WATCHDOG_AUTOMATION@0.1` — Material Pending Watchdog | Detect classes whose material has not been uploaded | class | scheduled |
| SWF-216 | `CLASS_RESCHEDULE_AUTOMATION@0.1` — Class Reschedule | Update schedule and notify enrolled students | class | durable |
| SWF-217 | `CLASS_CANCEL_AUTOMATION@0.1` — Class Cancellation | Cancel the session and notify enrolled students | class | function |
| SWF-218 | `ASSIGNMENT_REMINDER_AUTOMATION@0.1` — Assignment Reminder | Find pending assignments and remind students | student/task | scheduled |

### workshop vehicle

| ID | Workflow | Human active work reduced | Savings unit | Runtime |
|---|---|---|---|---|
| SWF-219 | `VEHICLE_APPOINTMENT_INTAKE_AUTOMATION@0.1` — Vehicle Appointment Intake | Register workshop booking requests | appointment | function |
| SWF-220 | `VEHICLE_SERVICE_REMINDER_AUTOMATION@0.1` — Vehicle Service Reminder | Find upcoming recommended service dates and contact the customer | vehicle | scheduled |
| SWF-221 | `VEHICLE_STATUS_SELF_SERVICE_AUTOMATION@0.1` — Vehicle Status Self-service | Answer customer status queries from the current work order | query | function |
| SWF-222 | `ADDITIONAL_WORK_APPROVAL_AUTOMATION@0.1` — Additional Work Customer Approval | Send extra-work details and capture customer approval | approval | human_loop |
| SWF-223 | `VEHICLE_READY_NOTIFY_AUTOMATION@0.1` — Vehicle Ready Notification | Notify the customer when the work order reaches ready state | vehicle | function |
| SWF-224 | `POST_SERVICE_REVIEW_AUTOMATION@0.1` — Post-service Review | Request feedback after workshop service | service | scheduled |
| SWF-225 | `WORKSHOP_NO_SHOW_RECOVERY_AUTOMATION@0.1` — Workshop No-show Recovery | Contact customers who missed workshop appointments | no-show | scheduled |

### marketing admin

| ID | Workflow | Human active work reduced | Savings unit | Runtime |
|---|---|---|---|---|
| SWF-226 | `CAMPAIGN_LEAD_CAPTURE_AUTOMATION@0.1` — Campaign Lead Capture | Capture campaign leads into the normalized lead process | lead | function |
| SWF-227 | `AUDIENCE_SYNC_AUTOMATION@0.1` — Audience Sync | Synchronize approved audiences between systems | contact | scheduled |
| SWF-228 | `CONTENT_APPROVAL_AUTOMATION@0.1` — Content Approval | Route scheduled content for configured approval | content item | human_loop |
| SWF-229 | `CONTENT_SCHEDULE_AUTOMATION@0.1` — Content Scheduling | Publish approved content on schedule | content item | scheduled |
| SWF-230 | `CAMPAIGN_REPORT_AUTOMATION@0.1` — Campaign Report | Compile campaign metrics automatically | report | scheduled |
| SWF-231 | `EVENT_REGISTRATION_AUTOMATION@0.1` — Event Registration | Register event attendees from forms/messages | attendee | function |
| SWF-232 | `EVENT_REMINDER_AUTOMATION@0.1` — Event Reminder | Send event reminders to registered attendees | attendee/event | scheduled |
| SWF-233 | `WEB_FORM_TO_RECORD_AUTOMATION@0.1` — Web Form to Record | Convert form responses into the target business record | submission | function |

## Deployment rule

A catalog item becomes deployable only through:

```text
DESIGN_READY
→ SELECTED_FOR_SYNTHESIS
→ HARDENED
→ TESTED
→ APPROVED_BASELINE
→ CLIENT_CONFIGURED
→ CLIENT_ACCEPTED
```

The catalog can be large; the approved runtime library remains selective.
