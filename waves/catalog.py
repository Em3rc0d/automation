"""Authoritative W3-W11 capability catalog.

The catalog describes semantic business boundaries, not provider variants.
Provider/account/client differences belong in connector/configuration layers and
must never increase the capability count.
"""
from __future__ import annotations

WAVES = {
    3: {
        "theme": "lead-orchestration",
        "family": "leadflow",
        "capabilities": [
            ("LEAD_OMNICHANNEL_CAPTURE", "NORMALIZE", False, "medium"),
            ("LEAD_IDENTITY_RESOLUTION", "MATCH", False, "medium"),
            ("LEAD_DEDUPE_MERGE", "DEDUPE", False, "medium"),
            ("LEAD_QUALIFY_SCORE", "SCORE", False, "medium"),
            ("LEAD_ROUTE_CAPACITY", "ROUTE", True, "medium"),
            ("LEAD_SLA_ESCALATE", "MONITOR", True, "medium"),
            ("LEAD_FOLLOWUP_SEQUENCE", "SEQUENCE", True, "medium"),
            ("LEAD_CONSENT_GUARD", "POLICY", False, "high"),
            ("LEAD_OPPORTUNITY_STAGE", "STATE", True, "medium"),
            ("LEAD_REACTIVATION", "SEQUENCE", True, "medium"),
            ("LEAD_ATTRIBUTION_VALUE", "AGGREGATE", False, "medium"),
        ],
    },
    4: {
        "theme": "quote-to-cash",
        "family": "quote2cash",
        "capabilities": [
            ("REQUEST_TO_QUOTE_NORMALIZE", "NORMALIZE", False, "medium"),
            ("PRICING_RULE_ENGINE", "VALIDATE", False, "high"),
            ("DISCOUNT_APPROVAL", "POLICY", True, "high"),
            ("QUOTE_COMPOSE_VERSION", "COMPOSE", False, "medium"),
            ("QUOTE_DELIVER_PROOF", "COMPOSE", True, "medium"),
            ("QUOTE_FOLLOWUP_INTENT", "SCORE", False, "medium"),
            ("QUOTE_ACCEPTANCE_CAPTURE", "STATE", True, "high"),
            ("INVOICE_REQUEST_PREPARE", "COMPOSE", True, "high"),
            ("PAYMENT_STATUS_RECONCILE", "RECONCILE", False, "high"),
            ("COLLECTION_SEQUENCE", "SEQUENCE", True, "high"),
            ("CASH_APPLICATION_MATCH", "MATCH", False, "high"),
        ],
    },
    5: {
        "theme": "appointments-service",
        "family": "appointments",
        "capabilities": [
            ("BOOKING_REQUEST_NORMALIZE", "NORMALIZE", False, "medium"),
            ("AVAILABILITY_AGGREGATE", "AGGREGATE", False, "medium"),
            ("SLOT_SCORE_SELECT", "ROUTE", False, "medium"),
            ("BOOKING_RESERVATION_IDEMPOTENT", "COMPOSE", True, "high"),
            ("CONFIRMATION_ORCHESTRATE", "SEQUENCE", True, "medium"),
            ("REMINDER_SEQUENCE", "SEQUENCE", True, "medium"),
            ("RESCHEDULE_NEGOTIATE", "ROUTE", True, "medium"),
            ("CANCELLATION_POLICY", "POLICY", True, "high"),
            ("WAITLIST_FILL", "ROUTE", True, "medium"),
            ("NO_SHOW_RECOVERY", "SEQUENCE", True, "medium"),
            ("POST_SERVICE_FEEDBACK", "SCORE", True, "medium"),
        ],
    },
    6: {
        "theme": "smart-inbox-ops",
        "family": "opsflow",
        "capabilities": [
            ("EMAIL_INGEST_NORMALIZE", "NORMALIZE", False, "medium"),
            ("THREAD_RECONSTRUCT", "AGGREGATE", False, "medium"),
            ("INTENT_CLASSIFY_CONFIDENCE", "SCORE", False, "medium"),
            ("ENTITY_LINK_CLIENT", "MATCH", False, "medium"),
            ("ATTACHMENT_ROUTE", "ROUTE", False, "medium"),
            ("REQUEST_PRIORITY_SCORE", "SCORE", False, "medium"),
            ("TASK_CREATE_DEDUPE", "DEDUPE", True, "medium"),
            ("OWNER_ASSIGN_LOAD", "ROUTE", True, "medium"),
            ("RESPONSE_DRAFT_GUARDED", "POLICY", False, "high"),
            ("SLA_BREACH_ESCALATE", "MONITOR", True, "medium"),
            ("EXECUTIVE_INBOX_DIGEST", "AGGREGATE", False, "medium"),
        ],
    },
    7: {
        "theme": "customer-support",
        "family": "support",
        "capabilities": [
            ("SUPPORT_INTAKE_OMNICHANNEL", "NORMALIZE", False, "medium"),
            ("ISSUE_IDENTITY_DEDUPE", "DEDUPE", False, "medium"),
            ("SEVERITY_CLASSIFY", "SCORE", False, "high"),
            ("ENTITLEMENT_POLICY_CHECK", "POLICY", False, "high"),
            ("TICKET_ROUTE_SKILL", "ROUTE", True, "medium"),
            ("KNOWLEDGE_RECOMMEND", "MATCH", False, "medium"),
            ("RESPONSE_APPROVAL_GUARD", "POLICY", True, "high"),
            ("SLA_TIMER_ESCALATE", "MONITOR", True, "high"),
            ("CUSTOMER_UPDATE_SEQUENCE", "SEQUENCE", True, "medium"),
            ("RESOLUTION_VALIDATE", "VALIDATE", False, "high"),
            ("CSAT_RECOVERY", "SCORE", True, "medium"),
        ],
    },
    8: {
        "theme": "client-onboarding",
        "family": "onboarding",
        "capabilities": [
            ("ONBOARDING_INTAKE", "NORMALIZE", False, "medium"),
            ("DATA_COMPLETENESS_VALIDATE", "VALIDATE", False, "high"),
            ("DOCUMENT_REQUIREMENT_MATRIX", "POLICY", False, "high"),
            ("CONTRACT_PACKET_COMPOSE", "COMPOSE", False, "high"),
            ("ESIGN_STATUS_TRACK", "STATE", False, "high"),
            ("CREDENTIAL_PROVISION_REQUEST", "COMPOSE", True, "high"),
            ("TRAINING_ASSIGN_TRACK", "STATE", True, "medium"),
            ("MILESTONE_ORCHESTRATE", "SEQUENCE", True, "medium"),
            ("BLOCKER_ESCALATE", "MONITOR", True, "medium"),
            ("HANDOFF_TO_OPERATIONS", "POLICY", True, "high"),
            ("ONBOARDING_HEALTH_SCORE", "SCORE", False, "medium"),
        ],
    },
    9: {
        "theme": "procurement-inventory",
        "family": "procurement",
        "capabilities": [
            ("PURCHASE_REQUEST_NORMALIZE", "NORMALIZE", False, "medium"),
            ("APPROVAL_MATRIX", "POLICY", True, "high"),
            ("SUPPLIER_MATCH_SCORE", "MATCH", False, "high"),
            ("RFQ_ORCHESTRATE", "SEQUENCE", True, "medium"),
            ("QUOTE_COMPARE", "SCORE", False, "high"),
            ("PO_COMPOSE_IDEMPOTENT", "COMPOSE", True, "high"),
            ("RECEIPT_MATCH", "MATCH", False, "high"),
            ("THREE_WAY_MATCH", "RECONCILE", False, "high"),
            ("STOCK_REORDER_SIGNAL", "MONITOR", True, "medium"),
            ("BACKORDER_ESCALATE", "MONITOR", True, "medium"),
            ("SUPPLIER_PERFORMANCE_SCORE", "SCORE", False, "medium"),
        ],
    },
    10: {
        "theme": "finance-management",
        "family": "finance",
        "capabilities": [
            ("EXPENSE_INTAKE_VALIDATE", "VALIDATE", False, "high"),
            ("COST_CENTER_ALLOCATE", "ROUTE", False, "high"),
            ("DUPLICATE_EXPENSE_DETECT", "DEDUPE", False, "high"),
            ("BUDGET_POLICY_CHECK", "POLICY", False, "high"),
            ("PAYMENT_APPROVAL_ORCHESTRATE", "POLICY", True, "high"),
            ("BANK_TRANSACTION_NORMALIZE", "NORMALIZE", False, "high"),
            ("RECONCILIATION_MATCH", "RECONCILE", False, "high"),
            ("CASHFLOW_BUCKET_FORECAST", "FORECAST", False, "high"),
            ("ANOMALY_TRIAGE", "SCORE", False, "high"),
            ("PERIOD_CLOSE_CHECKLIST", "STATE", True, "high"),
            ("EXECUTIVE_FINANCE_BRIEF", "AGGREGATE", False, "high"),
        ],
    },
    11: {
        "theme": "automation-os",
        "family": "automation-os",
        "capabilities": [
            ("CONNECTOR_HEALTH_MONITOR", "MONITOR", False, "high"),
            ("CREDENTIAL_EXPIRY_ALERT", "MONITOR", True, "high"),
            ("WEBHOOK_SIGNATURE_VERIFY", "VERIFY", False, "high"),
            ("RATE_LIMIT_GOVERNOR", "GOVERNOR", False, "high"),
            ("RETRY_POLICY_ENGINE", "GOVERNOR", False, "high"),
            ("IDEMPOTENCY_REGISTRY", "DEDUPE", False, "high"),
            ("EXECUTION_SLA_MONITOR", "MONITOR", True, "high"),
            ("INCIDENT_CORRELATOR", "MATCH", False, "high"),
            ("APPROVAL_POLICY_ENGINE", "POLICY", False, "high"),
            ("SAVINGS_EVENT_CALCULATOR", "SAVINGS", False, "high"),
            ("TENANT_DATA_RETENTION_GUARD", "RETENTION", True, "high"),
        ],
    },
}

PATTERN_EXPECTED = {
    "NORMALIZE": ("accepted", "rejected"),
    "MATCH": ("matched", "review"),
    "DEDUPE": ("new", "duplicate"),
    "SCORE": ("qualified", "review"),
    "ROUTE": ("assigned", "review"),
    "MONITOR": ("healthy", "escalate"),
    "SEQUENCE": ("scheduled", "capped"),
    "POLICY": ("allow", "review"),
    "STATE": ("transitioned", "blocked"),
    "AGGREGATE": ("summarized", "empty"),
    "VALIDATE": ("valid", "invalid"),
    "COMPOSE": ("proposed", "blocked"),
    "RECONCILE": ("reconciled", "unmatched"),
    "FORECAST": ("forecasted", "insufficient_data"),
    "VERIFY": ("verified", "rejected"),
    "GOVERNOR": ("allow", "throttle"),
    "SAVINGS": ("calculated", "invalid"),
    "RETENTION": ("retain", "expire"),
}

COMPLEX_PATTERNS = {"MATCH", "ROUTE", "POLICY", "RECONCILE", "FORECAST", "VERIFY", "GOVERNOR", "SAVINGS", "RETENTION"}


def iter_capabilities():
    for wave, spec in WAVES.items():
        for key, pattern, side_effect, risk in spec["capabilities"]:
            yield {
                "wave": wave,
                "theme": spec["theme"],
                "family": spec["family"],
                "key": key,
                "pattern": pattern,
                "side_effect": side_effect,
                "risk": risk,
            }
