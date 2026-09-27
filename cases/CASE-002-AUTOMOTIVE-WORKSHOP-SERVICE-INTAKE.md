# CASE-002 — Automotive Workshop Service Intake, Evidence and Appointment Orchestration

Status: **PRODUCTIVE PILOT DESIGN**  
Case type: **Assembly / coverage proof**  
Primary business: **independent automotive workshop / multi-bay repair shop**  
Primary user: **workshop owner, service manager, service advisor**  
Customer channel: **WhatsApp**  
Primary operational outcome: **turn unstructured customer requests into a traceable service request, useful evidence, an appointment or human escalation, and a workshop-ready pre-order**

---

## 1. Business context

Automotive workshops receive highly variable customer requests through WhatsApp, phone and walk-in channels. A customer rarely arrives with a normalized service request. They usually describe symptoms, noises, warning lights, leaks, prior repairs, maintenance needs, warranty concerns or roadside emergencies in their own words.

Typical messages include:

```text
"Mi carro está botando aceite."
"Se prendió el check engine."
"Cuando freno vibra bastante."
"Sigue sonando lo mismo que repararon la semana pasada."
"Quiero mantenimiento de 80,000 km."
"No prende y estoy varado."
"¿Pueden mandar grúa?"
"Necesito revisión antes de viajar."
```

The workshop's operational problem is not merely appointment scheduling. It is the repetitive work required to:

- identify the customer and vehicle;
- understand the customer's actual need;
- collect missing details;
- request useful photos/video/audio when appropriate;
- distinguish routine service from urgent or exception cases;
- preserve customer-reported facts separately from workshop diagnosis;
- offer appointment slots when scheduling is the correct next action;
- create a workshop-ready intake/pre-work-order;
- keep evidence and operational history auditable;
- escalate only the requests that genuinely require human judgment.

The business problem is therefore:

> Reduce repetitive reception and intake work while improving the quality, traceability and completeness of information available to the workshop before the vehicle arrives, without turning AI into the mechanical diagnosis authority.

---

## 2. Productive outcome

A customer should be able to write naturally through WhatsApp, for example:

```text
Mi camioneta está botando aceite desde ayer.
```

The system should be able to:

1. identify or create the customer context;
2. identify or request the relevant vehicle;
3. create a normalized `ServiceRequest`;
4. classify the request into an operational category without claiming a mechanical diagnosis;
5. determine what information is missing;
6. request useful evidence when appropriate;
7. download, validate, store and reference that evidence;
8. produce structured automated observations from useful media when configured;
9. keep customer statements, automated observations and technician findings as separate authorities;
10. determine whether the next action is appointment, human review, warranty review, urgent assistance or another configured path;
11. query availability and create an appointment when appropriate;
12. create a workshop-ready pre-work-order or work-request record;
13. confirm the outcome to the customer;
14. emit auditable telemetry, incidents and savings events.

The target customer experience is conversational and simple. The target workshop outcome is structured and operationally useful.

---

## 3. System boundary

### Inside Automation

- WhatsApp message intake and outbound responses;
- customer/contact identity resolution;
- vehicle identity/context management;
- conversation/thread persistence;
- service-request normalization;
- request classification and missing-data detection;
- configurable follow-up questions;
- media download and evidence registration;
- evidence validation and storage;
- optional multimodal observation extraction;
- appointment request / availability / hold / create / confirm;
- human-review / exception queue;
- work-request / pre-work-order creation;
- customer notifications;
- execution telemetry, incident handling and savings events;
- operator-visible audit trail.

### External systems / authorities

Depending on the workshop installation:

- **Meta WhatsApp Cloud API** — default customer messaging adapter target;
- **Google Calendar / Microsoft Calendar / Cal.com / existing booking system** — scheduling authority;
- **workshop DMS/ERP/work-order system** — operational authority when the client already has one;
- **Supabase/Postgres** — lightweight operational store for a controlled pilot when no existing system is available;
- **Supabase Storage / S3-compatible storage / equivalent** — evidence object storage;
- **multimodal AI provider** — structured visual observation only, under explicit policy;
- **tow/field-service provider** — future roadside dispatch authority when integrated.

### Explicit non-goals for V1

- autonomous mechanical diagnosis;
- telling a customer that a specific mechanical component has failed solely from text/photo/video;
- replacing the workshop's DMS/ERP if one already exists;
- complete inventory/accounting implementation;
- autonomous repair authorization;
- universal VIN/parts catalog;
- insurer claim adjudication;
- tow-truck fleet management;
- real-time GPS dispatch platform;
- predictive maintenance from vehicle telemetry;
- storing media binaries inside execution logs or generic JSON payload logs.

---

## 4. Productive architecture

```text
CUSTOMER
  |
  | WhatsApp text / image / video / audio
  v
messaging.receive
  |
  v
MESSAGE_INTAKE / thread context
  |
  v
Customer resolve
  |
  v
Vehicle resolve
  |
  v
SERVICE_REQUEST
  |
  +-------------------------------+
  |                               |
  | missing information?          | media received?
  v                               v
FOLLOW-UP QUESTIONS          MEDIA_DOWNLOAD
  |                               |
  |                               v
  |                         EVIDENCE_VALIDATE
  |                               |
  |                               v
  |                         OBJECT STORAGE
  |                               |
  |                               v
  |                    optional multimodal analysis
  |                               |
  |                               v
  |                    AUTOMATED_OBSERVATION
  |                               |
  +---------------+---------------+
                  |
                  v
            OPERATIONAL TRIAGE
                  |
        +---------+----------+
        |         |          |
        v         v          v
   HUMAN REVIEW  APPOINTMENT  URGENT/ASSISTANCE
                  |
                  v
          AVAILABILITY_CHECK
                  |
                  v
             SLOT_HOLD
                  |
                  v
          APPOINTMENT_CREATE
                  |
                  v
          WORK_ORDER_CREATE
                  |
                  v
          APPOINTMENT_CONFIRM
                  |
                  v
        EXECUTION_TELEMETRY
```

The architecture deliberately separates evidence analysis from technical diagnosis.

---

## 5. Repository capabilities reused

### 5.1 Messaging and media

From `workflows/CONNECTOR-MATRIX.md`:

- `messaging.receive`
- `messaging.send`
- `messaging.thread.read`
- `messaging.media.download`

Initial provider target:

- Meta WhatsApp Cloud API

WhatsApp is an adapter choice, not a workshop-specific business capability.

### 5.2 Appointments and scheduling

From `workflows/SMB-CAPABILITY-LIBRARY.md`:

- `APPOINTMENT_REQUEST@1`
- `APPOINTMENT_VALIDATE_REQUEST@1`
- `AVAILABILITY_CHECK@1`
- `SLOT_HOLD@1`
- `APPOINTMENT_CREATE@1`
- `APPOINTMENT_CONFIRM@1`
- `APPOINTMENT_REMIND@1`
- `APPOINTMENT_RESCHEDULE@1`
- `APPOINTMENT_CANCEL@1`
- `WAITLIST_FILL@1`
- `NO_SHOW_RECOVERY@1`
- `APPOINTMENT_POST_VISIT@1`

From `workflows/CONNECTOR-MATRIX.md`:

- `calendar.availability.read`
- `calendar.event.create`
- `calendar.event.update`
- `calendar.event.cancel`
- `booking.create`
- `booking.reschedule`
- `booking.cancel`
- `booking.webhook`

### 5.3 Work order / service operations

From `workflows/SMB-CAPABILITY-LIBRARY.md`:

- `WORK_REQUEST_INTAKE@1`
- `WORK_ORDER_CREATE@1`
- `WORK_ASSIGN@1`
- `WORK_STATUS_SYNC@1`
- `WORK_SLA_WATCHDOG@1`
- `WORK_CUSTOMER_NOTIFY@1`
- `WORK_COMPLETE@1`
- `SERVICE_MAINTENANCE_REMINDER@1`

These are the primary reusable semantics for workshops and other service businesses.

### 5.4 Human review and exception handling

- `APPROVAL_REQUEST@1`
- `APPROVAL_DECISION@1`
- `EXCEPTION_QUEUE@1`
- `HUMAN_REVIEW_TASK@1`
- `EXECUTION_TELEMETRY@1`
- `ERROR_TO_INCIDENT@1`

### 5.5 Quote / estimate expansion path

Not required for the first narrow V1, but already represented for later assembly:

- `QUOTE_REQUEST@1`
- `QUOTE_CALCULATE@1`
- `QUOTE_APPROVAL@1`
- `QUOTE_GENERATE_DOC@1`
- `QUOTE_DELIVER@1`
- `QUOTE_ACCEPTANCE_CAPTURE@1`

### 5.6 Inventory / parts expansion path

Also represented for later versions:

- `INVENTORY_CHECK@1`
- `INVENTORY_RESERVE@1`
- `LOW_STOCK_ALERT@1`
- `REORDER_RECOMMEND@1`
- `PURCHASE_REQUEST@1`
- `PO_GENERATE@1`
- `PO_APPROVE@1`
- `PO_SEND@1`

### 5.7 Storage / AI engine targets

From the connector matrix and existing repository architecture:

- `storage.file.put`
- `storage.file.get`
- `storage.file.hash`
- multimodal extraction providers as replaceable adapters/engines;
- Supabase Storage / S3-compatible object storage as evidence stores.

---

## 6. Domain model required by the case

CASE-002 requires domain records that are not necessarily new toolbox capabilities.

### Customer

```text
id
tenantId
name?
whatsappPhone
email?
createdAt
updatedAt
```

### Vehicle

`Vehicle` is a vertical domain entity, not automatically a new CAPABILITY.

```text
id
tenantId
customerId
plate
vin?
make?
model?
year?
engine?
transmission?
fuelType?
currentMileage?
lastMileageObservedAt?
createdAt
updatedAt
```

Only fields actually supplied by the customer, workshop or an authorized source may be persisted. The system must not invent unavailable vehicle attributes.

### ServiceRequest

```text
id
tenantId
customerId
vehicleId?
conversationId?
source
requestType
status
urgency
customerReportedSummary
vehicleOperationalState?
appointmentRequired?
humanReviewRequired
createdAt
updatedAt
```

Candidate `requestType` values for policy/configuration:

```text
scheduled_maintenance
diagnostic_request
repair_request
inspection_request
warranty_or_comeback
bodywork_or_collision
roadside_assistance
other
```

These values are configuration/taxonomy unless future evidence justifies a stronger semantic boundary.

### CustomerReportedCondition

This record preserves what the customer actually reported.

```text
id
serviceRequestId
category?
bodyArea?
customerText
reportedAt
sourceMessageId?
```

Examples:

```text
noise
vibration
warning_light
fluid_leak
starting_problem
overheating
braking_issue
steering_issue
body_damage
maintenance_due
other
```

These categories help routing and questioning. They are not diagnoses.

### Evidence

```text
id
tenantId
serviceRequestId
source
sourceMessageId?
type
storageReference
contentHash
mimeType
sizeBytes?
receivedAt
capturedAt?
validationStatus
analysisStatus
retentionClass?
```

`type` may include:

```text
photo
video
audio
document
```

### AutomatedObservation

Automated observations are evidence-derived structured notes, never technician diagnosis.

```text
id
tenantId
serviceRequestId
evidenceId
observationType
description
confidence?
modelProvider?
modelName?
modelVersion?
requiresHumanReview
createdAt
```

### TechnicianFinding

```text
id
serviceRequestId
workOrderId?
technicianId?
summary
createdAt
```

### Diagnosis

```text
id
serviceRequestId
workOrderId?
diagnosedBy
diagnosisSummary
confirmedAt
```

Permanent authority boundary:

```text
CustomerReportedCondition
!= AutomatedObservation
!= TechnicianFinding
!= Diagnosis
```

### Appointment

```text
id
serviceRequestId
provider
providerEventId
startsAt
endsAt
timezone
status
createdAt
```

### WorkOrder / PreWorkOrder

```text
id
serviceRequestId
vehicleId
appointmentId?
externalWorkOrderId?
status
assignedAdvisor?
assignedTechnician?
openedAt
completedAt?
```

For a first pilot without DMS integration this may live in Postgres as a lightweight pre-work-order. If the client already has a DMS/ERP, Automation should create or reference the external record through an adapter rather than become a competing system of record.

---

## 7. ServiceRequest contract

Provider-neutral example:

```json
{
  "schemaVersion": 1,
  "tenantId": "tenant_uuid",
  "customerId": "customer_uuid",
  "vehicleId": "vehicle_uuid",
  "source": "whatsapp",
  "requestType": "diagnostic_request",
  "customerReportedSummary": "Cliente reporta fuga de líquido debajo de la zona frontal.",
  "vehicleOperationalState": "drivable",
  "urgency": "normal",
  "evidenceRequested": true,
  "humanReviewRequired": false
}
```

The contract must preserve uncertainty. It must not encode an AI-generated mechanical diagnosis as fact.

---

## 8. Evidence intake contract

### Evidence received

```json
{
  "schemaVersion": 1,
  "serviceRequestId": "sr_uuid",
  "source": "whatsapp",
  "sourceMessageId": "wamid...",
  "type": "photo",
  "mimeType": "image/jpeg",
  "storageReference": "tenant/.../evidence/ev_uuid.jpg",
  "contentHash": "sha256:...",
  "receivedAt": "2026-09-14T14:00:00Z"
}
```

### Validation result

```json
{
  "evidenceId": "ev_uuid",
  "valid": true,
  "usable": true,
  "reason": null,
  "duplicateOf": null
}
```

Example unusable result:

```json
{
  "evidenceId": "ev_uuid",
  "valid": true,
  "usable": false,
  "reason": "insufficient_visibility",
  "suggestedAction": "request_another_photo"
}
```

---

## 9. Visual evidence assessment boundary

The first implementation SHOULD attempt this as composition of existing infrastructure rather than immediately admitting a new toolbox capability:

```text
messaging.media.download
+ storage.file.put
+ storage.file.hash
+ multimodal structured extraction
+ policy validation
+ human-review gate
```

Candidate future semantic boundary for admission review:

```text
VISUAL_EVIDENCE_ASSESS@1
```

Do not admit it merely because CASE-002 needs it. It should pass the capability admission test from `workflows/TOOLBOX-NORTH-STAR.md`, including reuse across multiple plausible verticals.

Potential reuse beyond automotive workshops:

- appliance repair;
- field maintenance;
- insurance intake;
- property maintenance;
- construction inspections;
- industrial equipment servicing;
- technical support with physical assets.

### Example structured output

```json
{
  "usable": true,
  "relevance": "likely_relevant",
  "observations": [
    "Se observa líquido oscuro sobre el suelo.",
    "La acumulación aparece debajo de la zona frontal del vehículo."
  ],
  "possibleCategory": "fluid_leak",
  "cannotDetermine": [
    "tipo exacto de fluido",
    "origen mecánico exacto",
    "componente responsable"
  ],
  "recommendedNextStep": "workshop_inspection",
  "requiresHumanTechnicalDiagnosis": true
}
```

The model output is an observation aid, not technical authority.

---

## 10. AI boundary

AI may be used for:

- natural-language intent extraction;
- normalization of customer descriptions;
- identifying missing information;
- generating safe follow-up questions;
- media relevance/quality checks;
- structured visual observations;
- summarizing the intake for the service advisor.

AI MUST NOT be the authority for:

- definitive mechanical diagnosis;
- declaring a vehicle safe to drive;
- authorizing or rejecting warranty coverage;
- repair authorization;
- final pricing/tax/arithmetic;
- claiming that a specific component has failed solely from media;
- hiding uncertainty from the customer or workshop.

The system should prefer language such as:

```text
"Se observa..."
"La imagen parece ser consistente con..."
"No es posible determinar con seguridad..."
"Requiere inspección del taller."
```

rather than:

```text
"La falla es..."
"Tu componente X está roto."
```

---

## 11. Dynamic intake and follow-up policy

The conversation SHOULD ask only for information that materially improves routing or workshop readiness.

Example:

```text
Customer:
"Mi carro está botando aceite."

System:
"¿Podrías enviarme una foto de la zona donde observas la fuga?"
```

After a usable photo:

```text
"Gracias. Ya adjunté la imagen a tu solicitud. No es posible determinar el origen exacto solo con la foto. ¿El vehículo puede desplazarse normalmente?"
```

If the image is unusable:

```text
"No logro distinguir bien la zona de la fuga. ¿Podrías tomar otra foto un poco más cerca y con buena iluminación?"
```

Follow-up rules are tenant/vertical policy and SHOULD NOT become workflow forks.

Candidate configurable fields:

```text
requirePlateBeforeBooking
requireVehicleModelBeforeBooking
requestMediaForCategories[]
maxMediaRequestsPerIntake
allowedMediaTypes[]
maxMediaSizeBytes
multimodalAnalysisEnabled
humanReviewCategories[]
urgentCategories[]
staleConversationTimeoutMinutes
appointmentDurationByRequestType
```

---

## 12. Operational triage

The system should route to operational outcomes, not medical-style or mechanical diagnosis outcomes.

Example triage outputs:

```text
appointment
human_review
warranty_review
urgent_assistance
request_more_information
existing_service_followup
```

### Example: routine diagnostic intake

```text
MESSAGE_INTAKE
-> CUSTOMER_RESOLVE
-> VEHICLE_RESOLVE
-> SERVICE_REQUEST
-> EVIDENCE_REQUEST
-> EVIDENCE_VALIDATE
-> AUTOMATED_OBSERVATION
-> APPOINTMENT_REQUEST
-> AVAILABILITY_CHECK
-> SLOT_HOLD
-> APPOINTMENT_CREATE
-> WORK_ORDER_CREATE
-> APPOINTMENT_CONFIRM
```

### Example: unclear/exception case

```text
SERVICE_REQUEST
-> incomplete/ambiguous
-> HUMAN_REVIEW_TASK
-> service advisor decision
```

### Example: vehicle immobilized / roadside assistance

```text
SERVICE_REQUEST
-> urgent_assistance
-> collect location/context
-> HUMAN/EXTERNAL DISPATCH
```

The final path is intentionally incomplete in V1 because field-service dispatch is a discovered gap.

---

## 13. Scheduling and race-condition rules

The existing scheduling hardening rules apply:

- availability read and booking creation must account for race conditions;
- persist provider booking/event ID;
- slot hold should be used where the provider supports or requires it;
- reschedule/cancel are state transitions, not new anonymous bookings;
- tenant timezone is explicit;
- customer-facing confirmation must reflect provider-confirmed state;
- duplicate WhatsApp/webhook events must not duplicate appointments.

Suggested idempotency keys:

```text
service-request:<tenant>:<provider-thread-or-message-id>
evidence:<tenant>:<provider-media-id>
appointment:<service-request-id>:<slot-id>
work-order:<service-request-id>
```

---

## 14. Vehicle service history

The workshop should be able to associate prior service context with the vehicle when that history exists.

Examples:

```text
"Volvió el mismo ruido de la última vez."
"Me cambiaron esta pieza hace tres semanas."
"Quiero el mismo mantenimiento que la vez pasada."
```

Candidate semantic boundary for review:

```text
SERVICE_HISTORY_LOOKUP
```

Do not admit this as a new capability yet. First determine whether it can be represented cleanly as domain data access inside `WORK_REQUEST_INTAKE`, `WORK_ORDER_CREATE` and the client's DMS adapter.

---

## 15. Warranty / comeback gap

CASE-002 exposes the need to distinguish:

```text
new_service
vs
warranty_review
vs
comeback/rework
```

A customer statement such as:

```text
"Sigue fallando lo mismo que repararon hace dos semanas."
```

should not automatically create a completely unrelated new repair path.

Potential reusable candidate for later admission review:

```text
WARRANTY_ELIGIBILITY_EVALUATE
```

It may be reusable across:

- automotive workshops;
- appliances;
- industrial equipment;
- electronics;
- HVAC;
- technical service businesses.

For the first pilot, warranty/comeback handling SHOULD route to human review with prior-work-order context rather than autonomous eligibility decisions.

---

## 16. Roadside assistance / dispatch gap

The repository already covers intake, work assignment, state synchronization and customer notifications, but CASE-002 exposes a missing field-service resource/dispatch semantic boundary.

Candidate for capability admission review:

```text
FIELD_SERVICE_DISPATCH@1
```

Potential provider-neutral input:

```text
serviceRequest
location
requiredResourceCapability
priority
resourceConstraints
```

Potential output:

```text
assignedResource
externalDispatchId
eta?
dispatchStatus
```

Potential reuse:

- towing;
- onsite mechanics;
- HVAC technicians;
- electricians;
- locksmiths;
- plumbers;
- industrial maintenance;
- onsite IT support.

This is a genuine coverage gap and is explicitly OUT OF V1 until its contract and evidence are reviewed.

---

## 17. Evidence storage and logging policy

Media evidence MUST be stored as evidence objects, not as execution-log payload blobs.

### Preferred pattern

```text
Object Storage
    |
    v
Evidence(storageReference, hash, metadata)
    |
    v
ServiceRequest
```

Execution/event logs should contain references:

```json
{
  "eventType": "service.evidence.received",
  "serviceRequestId": "sr_uuid",
  "evidenceId": "ev_uuid",
  "mediaType": "image/jpeg"
}
```

and later:

```json
{
  "eventType": "service.evidence.analyzed",
  "serviceRequestId": "sr_uuid",
  "evidenceId": "ev_uuid",
  "result": "usable",
  "relevance": "likely_relevant"
}
```

### Never by default

```text
execution_logs.image_base64
full media embedded in telemetry JSON
provider access tokens in evidence metadata
unbounded retention "just in case"
```

The installation must define retention/deletion policy for customer media and personally identifiable information.

---

## 18. Security and privacy requirements

Before productive activation:

- tenant-scoped storage paths;
- RLS/authorization on evidence metadata;
- signed/private object access where applicable;
- MIME/type validation;
- upload/download size limits;
- content hash and duplicate handling;
- no public object URLs by default;
- secrets only through connector/secret references;
- provider webhook verification and replay protection;
- idempotency on message, evidence, appointment and work-order side effects;
- PII/media redaction from application logs;
- explicit media retention policy;
- tenant delete/export behavior;
- audit trail for evidence access where operationally required;
- multimodal provider receives only the media/data needed for the configured task.

---

## 19. Client/workshop operator view

A service advisor should receive a prepared intake rather than an unstructured WhatsApp thread.

Example:

```text
SERVICE REQUEST SR-9201

Customer
Carlos Mendoza

Vehicle
Toyota Corolla 2020
Plate: ABC-123
Mileage: 64,320 km

Customer-reported condition
Fluid leak observed after parking.
Vehicle reported as drivable.
No warning light reported.

Evidence
2 photos

Automated observations
- dark liquid visible on ground
- accumulation appears below front area
- exact fluid/origin cannot be determined from image

Technical authority
Mechanical diagnosis pending.

Next action
Workshop inspection

Appointment
Tue 15:00
```

The UI must visually distinguish:

```text
customer-reported
AI/automated observation
technician finding
confirmed diagnosis
```

---

## 20. First productive V1 scope

The first V1 SHOULD prove only this value loop:

```text
WhatsApp
-> customer/vehicle context
-> service request
-> missing-information questions
-> optional photo evidence
-> evidence validation/storage
-> optional multimodal observation
-> operational triage
-> appointment availability
-> appointment creation
-> pre-work-order/work request
-> confirmation
-> telemetry / incident / savings event
```

### V1 explicitly excludes

- parts inventory;
- estimate/quote approval;
- payments;
- complete repair-status portal;
- warranty automation;
- tow dispatch automation;
- insurer integrations;
- VIN decoding services;
- automated technical diagnosis.

Those are later compositions once the intake loop is proven.

---

## 21. Initial implementation stack

Expected first productive pilot:

```text
Meta WhatsApp Cloud API
+ n8n orchestration
+ Supabase/Postgres
+ Supabase Storage or S3-compatible object storage
+ multimodal AI provider through structured output
+ Google Calendar / Microsoft Calendar / Cal.com adapter
+ deterministic policy code
+ human-review path
+ platform telemetry / incidents / savings
```

Provider choices remain adapters. Business semantics and case domain contracts remain provider-neutral.

---

## 22. Discovered coverage gaps

### Gap A — Vehicle domain model

Need a stable vertical entity for customer-owned vehicles. This is currently a data-model gap, not automatically a reusable capability gap.

### Gap B — ServiceRequest vertical model

Need an inspectable normalized service-intake record that preserves request type, reported condition, urgency and operational next action.

Again, this may remain case/domain data rather than become a new capability.

### Gap C — evidence semantic contract

The repository already has messaging media download, storage and multimodal/document processing primitives, but CASE-002 requires a stable evidence record and authority boundary.

Candidate:

```text
VISUAL_EVIDENCE_ASSESS
```

Admission decision: **DEFER — test composition first.**

### Gap D — service-history context

Candidate:

```text
SERVICE_HISTORY_LOOKUP
```

Admission decision: **DEFER — determine whether normal domain lookup is sufficient.**

### Gap E — warranty/comeback evaluation

Candidate:

```text
WARRANTY_ELIGIBILITY_EVALUATE
```

Admission decision: **REVIEW LATER — likely reusable, but V1 uses human review.**

### Gap F — field-service dispatch

Candidate:

```text
FIELD_SERVICE_DISPATCH
```

Admission decision: **STRONG CANDIDATE FOR FUTURE REVIEW.**

The missing resource availability, geolocation, assignment, ETA and external-dispatch semantics are not cleanly covered by current workshop primitives.

---

## 23. Productive pilot acceptance criteria

The pilot is successful only when all of the following are demonstrated with realistic data and controlled provider credentials:

1. A WhatsApp customer message creates or resolves exactly one conversation context.
2. Customer identity is resolved or safely requested when unknown.
3. Vehicle context is resolved or safely requested when required.
4. A normalized `ServiceRequest` is created without inventing mechanical facts.
5. The system can classify at least the agreed V1 request categories for routing purposes.
6. Missing information is requested without repeatedly asking for data already known.
7. When policy requires evidence, the system can request a photo through WhatsApp.
8. Received media is downloaded, MIME/size validated, hashed and stored outside execution logs.
9. Duplicate provider media/webhook events cannot create duplicate evidence records.
10. An unusable image can trigger a controlled request for better evidence.
11. A usable image can produce structured observations without asserting a confirmed diagnosis.
12. Customer-reported facts, automated observations and technician/diagnosis fields remain separate.
13. A configured case can proceed from completed intake to availability query.
14. Appointment creation persists the external provider event/booking ID.
15. Duplicate requests/callbacks cannot create duplicate appointments.
16. A successful booking creates or links a workshop pre-work-order/work request.
17. The customer receives a confirmation reflecting the provider-confirmed booking.
18. A case requiring human review cannot bypass the review state through an AI-generated answer.
19. Provider/API failures create a visible retry/incident path instead of silently losing the request.
20. Every business-critical run emits auditable telemetry.
21. Logs contain references and metadata, not raw image binaries or secrets.
22. Media retention/deletion behavior is documented and testable.
23. A Savings Engine baseline can compare manual reception time with automated intake units and exception/supervision time.

---

## 24. Minimum acceptance fixtures

Each fixture must capture:

- raw customer messages;
- resolved customer/vehicle context;
- expected `ServiceRequest`;
- evidence policy decision;
- expected evidence validation result;
- expected automated observation when enabled;
- expected operational routing result;
- expected appointment behavior;
- expected work-request/pre-work-order behavior;
- expected customer response;
- expected telemetry/audit events.

### A — fluid leak + useful image

```text
Customer:
"Mi camioneta está botando aceite desde ayer."

Expected:
- diagnostic/service request
- photo requested
- image stored as evidence
- visual observation describes visible facts only
- no definitive component/fluid diagnosis
- appointment path offered if vehicle is reported drivable and tenant policy allows
```

### B — fluid leak + unusable image

```text
Image is dark/blurred and does not show the relevant area.

Expected:
- evidence remains stored/audited
- usable=false
- request one additional photo under configured retry policy
```

### C — warning light photo

```text
Customer:
"Se me prendió esta luz."
+ dashboard photo

Expected:
- evidence linked
- visible indicator may be described only if confidence/policy allows
- no mechanical root-cause diagnosis
- workshop inspection path
```

### D — vibration without media

```text
"Cuando freno vibra bastante."

Expected:
- ask configured clarifying questions
- do not force photo if not useful under policy
- normalize reported condition
- offer diagnostic appointment
```

### E — prior-service/comeback

```text
"Sigue sonando lo mismo que repararon la semana pasada."

Expected:
- identify prior service if available
- classify as warranty/comeback review candidate
- route to human review in V1
- do not create an unrelated autonomous warranty decision
```

### F — scheduled maintenance

```text
"Quiero mantenimiento de 80 mil kilómetros."

Expected:
- scheduled maintenance request
- vehicle/mileage context
- direct scheduling path when required data is complete
```

### G — unknown vehicle

```text
Known customer, no matching vehicle.

Expected:
- request minimum configured vehicle identity fields
- do not invent VIN/model/year
```

### H — duplicate WhatsApp webhook

```text
Same inbound provider message delivered twice.

Expected:
- one normalized message/event
- one service request side effect
```

### I — duplicate media webhook

```text
Same WhatsApp media ID delivered twice.

Expected:
- one Evidence record or deterministic duplicate association
- no duplicate AI analysis charge unless explicitly retried
```

### J — appointment race

```text
Slot appears available but provider rejects booking because another booking won the race.

Expected:
- no false confirmation
- offer alternative slot or human path
- incident only when provider behavior is anomalous, not for normal conflict
```

### K — customer sends unrelated image

```text
Customer reports fluid leak but sends unrelated image.

Expected:
- relevance=unlikely/unclear
- ask for clarification or correct evidence
- do not hallucinate vehicle details
```

### L — vehicle immobilized / roadside request

```text
"No prende y estoy varado. ¿Pueden mandar grúa?"

Expected V1:
- urgent assistance classification
- collect minimum configured location/context
- route to human/external assistance path
- do not pretend automated dispatch exists
```

### M — provider media download failure

```text
WhatsApp media retrieval returns retryable failure.

Expected:
- bounded retry
- incident/attention path after exhaustion
- customer request remains recoverable
```

### N — multimodal provider unavailable

```text
Evidence stored successfully; AI provider fails.

Expected:
- intake does not lose evidence
- route without automated observation or to review according to tenant policy
- no fabricated result
```

### O — customer declines image

```text
Customer does not want/cannot send photo.

Expected:
- continue with text intake where policy permits
- do not block ordinary workshop appointment solely because media is absent unless client policy explicitly requires it
```

---

## 25. Savings / value measurement

CASE-002 should use the existing conservative Savings Engine methodology.

Primary measurable units:

```text
service requests received
service requests normalized automatically
media evidence collected automatically
appointments created automatically
pre-work-orders prepared automatically
requests requiring human exception handling
```

Potential baseline:

```text
manual reception minutes per service request
x automated service requests
- exception minutes
- human oversight minutes
= net minutes released
```

Useful operational KPIs:

```text
median first-response time
intake completion rate
percentage of requests arriving workshop-ready
percentage requiring human review
appointment conversion rate
reschedule/cancel rate
no-show rate
media evidence usefulness rate
provider failure rate
mean time waiting for customer information
```

Do not claim revenue uplift or payroll cash savings from these metrics without separate evidence.

---

## 26. Commercial framing

Customer-facing positioning:

> **Intelligent workshop reception through WhatsApp:** captures the customer's vehicle and service need, gathers useful evidence, prepares the intake, schedules when appropriate and leaves the workshop with a traceable pre-work-order instead of an unstructured chat.

Do not market the product as:

- autonomous mechanic;
- AI diagnosis service;
- complete DMS/ERP replacement;
- guaranteed warranty evaluator;
- automated tow-dispatch platform in V1.

The commercial value hypothesis is operational:

- fewer repetitive reception messages;
- faster first response;
- better information before arrival;
- fewer manually re-entered details;
- more consistent appointment intake;
- evidence attached to the request instead of buried in chat history;
- better traceability for repeat/warranty discussions;
- measurable reduction in reception effort.

---

## 27. Promotion / implementation order

Do not begin by synthesizing one giant workshop workflow.

Recommended order:

```text
1. Freeze CASE-002 contracts and V1 scope.
2. Reuse/adapt messaging intake and media-download patterns from the quarry.
3. Define Vehicle / ServiceRequest / Evidence persistence schema.
4. Implement deterministic evidence validation/storage path.
5. Add structured multimodal observation behind policy flag.
6. Reuse appointment baselines/candidates and harden for race/idempotency.
7. Reuse WORK_REQUEST_INTAKE / WORK_ORDER_CREATE semantics.
8. Add human-review routing.
9. Add telemetry / incident / savings events.
10. Run fixtures A-O.
11. Promote reusable pieces through normal certification gates.
```

Certification remains:

```text
DISCOVERED
-> LICENSE_CHECKED
-> INSPECTED
-> HARDENED
-> TESTED
-> APPROVED_BASELINE
```

CASE-002 itself does not waive baseline certification.

---

## 28. Decisions frozen by this case

1. **Appointment scheduling is not the product boundary.** It is one outcome of service intake.
2. **Media is evidence, not log payload.** Store objects separately and log references/events.
3. **Customer statement, AI observation and technical diagnosis are different authorities.** They must not share one mutable free-text field.
4. **AI may observe and summarize but does not own mechanical diagnosis.**
5. **Vehicle and ServiceRequest begin as domain/data models, not automatically new capabilities.**
6. **Visual evidence assessment must prove reuse before admission as a capability.**
7. **Warranty/comeback is human-reviewed in V1.**
8. **Field-service/tow dispatch is a real gap and out of V1.**
9. **Provider choices remain adapters.** WhatsApp, calendar and storage providers must not leak into business semantics.
10. **V1 proves intake -> evidence -> appointment -> pre-work-order -> telemetry.** Everything else is an expansion path.

---

## 29. Evidence required before calling CASE-002 production-ready

- real or provider-sandbox WhatsApp message flow;
- media download verified with real image metadata;
- private object-storage access verified;
- duplicate message/media tests;
- multimodal structured-output fixtures with safe uncertainty behavior;
- appointment provider race/idempotency tests;
- customer/vehicle/service-request persistence tests;
- human-review gate test;
- provider outage/timeout tests;
- log redaction review;
- media retention/delete test;
- RLS/tenant-isolation tests;
- telemetry/incident evidence;
- Savings Engine baseline approved with the pilot workshop;
- workshop/service-advisor review of the intake summary and terminology;
- explicit confirmation that the V1 does not present AI observations as diagnosis.

Until this evidence exists, CASE-002 remains a **productive pilot design / assembly target**, not an approved production baseline.
