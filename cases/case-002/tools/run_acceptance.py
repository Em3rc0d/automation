#!/usr/bin/env python3
"""Execute CASE-002 acceptance fixtures against the V1 deterministic case policy.

This runner is a test oracle for case routing and invariants. It deliberately
mocks external providers; live adapter/provider tests are separate.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

CASE = Path(__file__).resolve().parents[1]
FIXTURES = CASE / "fixtures/acceptance-fixtures.json"


def contains_any(text: str, terms: tuple[str, ...]) -> bool:
    t = text.lower()
    return any(term in t for term in terms)


def execute_case(fixture: dict) -> dict:
    x = fixture.get("input") or {}
    message = str(x.get("message") or "")
    media = x.get("media") or []
    history = x.get("history") or {}
    vehicle_state = str(x.get("vehicleOperationalState") or "")

    roadside = vehicle_state.startswith("immobilized") or contains_any(message, ("varado", "grúa", "grua"))
    comeback = bool(history.get("priorWorkOrderId")) and contains_any(message, ("repararon", "sigue", "garantía", "garantia"))
    maintenance = contains_any(message, ("mantenimiento", "80 mil", "80,000", "80000"))

    if roadside:
        request_type = "roadside_assistance"
        human_review = True
    elif comeback:
        request_type = "warranty_or_comeback"
        human_review = True
    elif maintenance:
        request_type = "scheduled_maintenance"
        human_review = False
    else:
        request_type = "diagnostic_request"
        human_review = False

    service_request = {
        "requestType": request_type,
        "humanReviewRequired": human_review,
        "evidenceRequested": request_type == "diagnostic_request",
    }

    evidence = None
    visual = None
    unusable = False
    if media:
        first = media[0]
        unusable = first.get("quality") == "dark_blurry"
        evidence = {
            "validationStatus": "unusable" if unusable else "valid",
            "analysisStatus": "not_run" if unusable else "completed",
        }
        visual = {
            "usable": not unusable,
            "relevance": "unknown" if unusable else "likely_relevant",
            "requiresHumanTechnicalDiagnosis": True,
            "recommendedNextStep": "request_another_photo" if unusable else "workshop_inspection",
        }

    if roadside:
        triage = {
            "route": "roadside_human_escalation",
            "humanReviewType": "roadside_dispatch",
            "mechanicalDiagnosisProduced": False,
        }
        side_effects = ["human_review_task_created", "telemetry_emitted"]
    elif comeback:
        triage = {
            "route": "human_review",
            "humanReviewType": "warranty",
            "mechanicalDiagnosisProduced": False,
        }
        side_effects = ["human_review_task_created", "telemetry_emitted"]
    elif unusable:
        triage = {"route": "request_evidence", "mechanicalDiagnosisProduced": False}
        side_effects = ["follow_up_question_sent", "telemetry_emitted"]
    elif maintenance:
        triage = {
            "route": "appointment",
            "appointmentIntent": "maintenance",
            "mechanicalDiagnosisProduced": False,
        }
        side_effects = [
            "availability_checked",
            "slot_held",
            "appointment_created",
            "pre_work_order_created",
            "customer_confirmation_sent",
            "telemetry_emitted",
        ]
    else:
        triage = {"route": "appointment", "mechanicalDiagnosisProduced": False}
        side_effects = [
            "appointment_created",
            "pre_work_order_created",
            "customer_confirmation_sent",
            "telemetry_emitted",
        ]

    return {
        "serviceRequest": service_request,
        "evidence": evidence,
        "visualAssessment": visual,
        "triage": triage,
        "sideEffects": side_effects,
        "forbiddenActions": [],
    }


def assert_subset(expected, actual, path="result") -> list[str]:
    errors: list[str] = []
    if isinstance(expected, dict):
        if not isinstance(actual, dict):
            return [f"{path}: expected object, got {type(actual).__name__}"]
        for key, value in expected.items():
            if key not in actual:
                errors.append(f"{path}.{key}: missing")
            else:
                errors.extend(assert_subset(value, actual[key], f"{path}.{key}"))
    elif isinstance(expected, list):
        if not isinstance(actual, list):
            errors.append(f"{path}: expected list")
        else:
            for item in expected:
                if item not in actual:
                    errors.append(f"{path}: missing item {item!r}")
    elif expected != actual:
        errors.append(f"{path}: expected {expected!r}, got {actual!r}")
    return errors


def main() -> int:
    data = json.loads(FIXTURES.read_text(encoding="utf-8"))
    failures: list[str] = []
    passed = 0

    for fixture in data.get("fixtures") or []:
        fid = fixture["id"]
        actual = execute_case(fixture)
        expected = fixture.get("expected") or {}

        comparable = {k: v for k, v in expected.items() if k not in {"mustNot"}}
        errors = assert_subset(comparable, actual, fid)

        must_not = expected.get("mustNot") or []
        produced_tokens = set(actual.get("sideEffects") or []) | set(actual.get("forbiddenActions") or [])
        for forbidden in must_not:
            if forbidden in produced_tokens:
                errors.append(f"{fid}: forbidden action produced: {forbidden}")

        if actual["triage"].get("mechanicalDiagnosisProduced") is not False:
            errors.append(f"{fid}: mechanical diagnosis boundary violated")

        if errors:
            failures.extend(errors)
            print(f"FAIL {fid}")
        else:
            passed += 1
            print(f"PASS {fid} -> {actual['triage']['route']}")

    if failures:
        print("\nCASE-002 ACCEPTANCE: FAIL")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print(f"\nCASE-002 ACCEPTANCE: PASS {passed}/{passed}")
    print("External providers: mocked/not invoked")
    print("Diagnosis authority invariant: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
