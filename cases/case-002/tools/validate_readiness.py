#!/usr/bin/env python3
"""Static readiness gate for CASE-002.

This is intentionally dependency-free. It checks case contracts/fixtures and the
currently required Kapso adapter packages without claiming runtime/provider
certification.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

CASE = Path(__file__).resolve().parents[1]
ROOT = CASE.parents[1]

EXPECTED_FIXTURES = {
    "F01_FLUID_LEAK_USABLE_PHOTO",
    "F02_FLUID_LEAK_UNUSABLE_PHOTO",
    "F03_SCHEDULED_MAINTENANCE_NO_MEDIA",
    "F04_WARRANTY_COMEBACK",
    "F05_ROADSIDE_ASSISTANCE",
}

CONTRACTS = [
    "service-request.schema.json",
    "evidence.schema.json",
    "visual-assessment.schema.json",
    "triage-decision.schema.json",
    "conversation-interpretation.schema.json",
]

KAPSO_PACKAGES = [
    "KAPSO_MESSAGE_RECEIVE@1.0",
    "KAPSO_MEDIA_DOWNLOAD@1.0",
    "KAPSO_MESSAGE_SEND@1.0",
]

REQUIRED_PACKAGE_FILES = {
    "workflow.json",
    "manifest.yaml",
    "config.schema.json",
    "README.md",
}

MEDIA_EVIDENCE_WORKFLOW = (
    CASE / "workflows/CASE002_LEVEL2_MEDIA_EVIDENCE@1.0/workflow.json"
)
APPOINTMENT_AGENT_WORKFLOW = (
    CASE / "workflows/CASE002_LEVEL2_APPOINTMENT_AGENT@1.0/workflow.json"
)
APPOINTMENT_OVERLAY_HELPER = (
    CASE / "runtime/railway/prepare-level2-appointment-agent.js"
)
GEMINI_INTERPRETER_WORKFLOW = (
    CASE / "workflows/CASE002_GEMINI_INTERPRETER@1.0/workflow.json"
)
CONVERSATION_AGENT_V2_WORKFLOW = (
    CASE / "workflows/CASE002_LEVEL2_CONVERSATION_AGENT@2.0/workflow.json"
)
GEMINI_POC_HELPER = (
    CASE / "runtime/railway/prepare-level2-gemini-poc.js"
)


def load_json(path: Path, errors: list[str]):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"invalid JSON {path.relative_to(ROOT)}: {exc}")
        return None


def require(condition: bool, errors: list[str], message: str) -> None:
    if not condition:
        errors.append(message)


def validate() -> list[str]:
    errors: list[str] = []

    for name in CONTRACTS:
        path = CASE / "contracts" / name
        require(path.is_file(), errors, f"missing contract: {path.relative_to(ROOT)}")
        if path.is_file():
            schema = load_json(path, errors)
            if schema:
                require(schema.get("type") == "object", errors, f"contract must be object schema: {name}")
                raw = path.read_text(encoding="utf-8").lower()
                for provider in ("kapso", "openwa"):
                    require(provider not in raw, errors, f"provider leak in case contract {name}: {provider}")

    fixture_path = CASE / "fixtures" / "acceptance-fixtures.json"
    data = load_json(fixture_path, errors) if fixture_path.is_file() else None
    require(data is not None, errors, "missing/invalid acceptance fixtures")
    if data:
        fixtures = data.get("fixtures") or []
        ids = {f.get("id") for f in fixtures}
        require(ids == EXPECTED_FIXTURES, errors, f"fixture set mismatch: {sorted(ids)}")
        for fixture in fixtures:
            fid = fixture.get("id", "<unknown>")
            expected = fixture.get("expected") or {}
            triage = expected.get("triage") or {}
            # This explicit field is the frozen authority boundary for every fixture.
            # `mustNot` is scenario-specific and is not required to redundantly repeat it.
            require(
                triage.get("mechanicalDiagnosisProduced") is False,
                errors,
                f"{fid}: diagnosis invariant missing/true",
            )

    adapter_root = ROOT / "quarries/workflow-quarry/30-hardened/adapters/messaging"
    seen_workflow_ids: set[str] = set()
    for package_name in KAPSO_PACKAGES:
        package = adapter_root / package_name
        require(package.is_dir(), errors, f"missing adapter package: {package.relative_to(ROOT)}")
        if not package.is_dir():
            continue
        files = {p.name for p in package.iterdir() if p.is_file()}
        missing = REQUIRED_PACKAGE_FILES - files
        require(not missing, errors, f"{package_name}: missing package files {sorted(missing)}")
        require((package / "evidence/TEST-PLAN.md").is_file(), errors, f"{package_name}: missing TEST-PLAN.md")
        require((package / "fixtures").is_dir() and any((package / "fixtures").glob("*.json")), errors, f"{package_name}: missing JSON fixtures")

        workflow_path = package / "workflow.json"
        workflow = load_json(workflow_path, errors) if workflow_path.is_file() else None
        if workflow:
            wid = workflow.get("id")
            require(isinstance(wid, str) and wid, errors, f"{package_name}: missing stable workflow id")
            if isinstance(wid, str):
                require(wid not in seen_workflow_ids, errors, f"duplicate workflow id: {wid}")
                seen_workflow_ids.add(wid)
            meta = workflow.get("meta") or {}
            require(meta.get("stage") == "HARDENED", errors, f"{package_name}: meta.stage != HARDENED")
            require(meta.get("artifactClass") == "ADAPTER", errors, f"{package_name}: artifactClass != ADAPTER")
            for node in workflow.get("nodes") or []:
                require(not node.get("credentials"), errors, f"{package_name}: bound credential on node {node.get('name')}")

            raw = workflow_path.read_text(encoding="utf-8").lower()
            require("base64" not in raw, errors, f"{package_name}: base64 serialization found in workflow")

            if package_name == "KAPSO_MESSAGE_SEND@1.0":
                send_nodes = [n for n in workflow.get("nodes") or [] if n.get("name") == "Send Kapso Message"]
                require(len(send_nodes) == 1, errors, "KAPSO_MESSAGE_SEND: send node missing")
                if send_nodes:
                    require(send_nodes[0].get("retryOnFail") is not True, errors, "KAPSO_MESSAGE_SEND: provider send must not auto-retry")

    require(
        MEDIA_EVIDENCE_WORKFLOW.is_file(),
        errors,
        f"missing Level-2 media evidence composition: {MEDIA_EVIDENCE_WORKFLOW.relative_to(ROOT)}",
    )
    media_evidence = load_json(MEDIA_EVIDENCE_WORKFLOW, errors) if MEDIA_EVIDENCE_WORKFLOW.is_file() else None
    if media_evidence:
        require(
            media_evidence.get("id") == "case002Level2MediaEvidenceV1",
            errors,
            "Level-2 media evidence composition has unexpected workflow id",
        )
        require(media_evidence.get("active") is False, errors, "Level-2 media evidence composition must remain inactive")
        meta = media_evidence.get("meta") or {}
        require(meta.get("stage") == "CASE_COMPOSITION", errors, "Level-2 media evidence composition stage mismatch")
        require(meta.get("testOnly") is True, errors, "Level-2 media evidence composition must be testOnly")
        require(meta.get("productionStorageRequired") is True, errors, "Level-2 media evidence composition must preserve production-storage gap")

        nodes = media_evidence.get("nodes") or []
        names = {node.get("name") for node in nodes}
        required_nodes = {
            "Download Media via Kapso Adapter",
            "Prepare Evidence Storage",
            "Write Evidence Binary",
            "Read Persisted Evidence",
            "Hash Persisted Evidence",
            "Verify Persistence and Build Evidence",
        }
        require(required_nodes.issubset(names), errors, "Level-2 media evidence composition missing required nodes")
        for node in nodes:
            require(not node.get("credentials"), errors, f"Level-2 media evidence composition has bound credential on node {node.get('name')}")

        raw = MEDIA_EVIDENCE_WORKFLOW.read_text(encoding="utf-8")
        require("kapsoMediaDownloadV1" in raw, errors, "Level-2 media evidence composition does not call hardened media adapter")
        require("/home/node/.n8n/storage/" in raw, errors, "Level-2 media evidence composition missing test-volume storage path")
        require("test-local-volume://case002/" in raw, errors, "Level-2 media evidence composition missing test-only storage reference")
        require("sha256:" in raw, errors, "Level-2 media evidence composition missing Evidence contentHash prefix")

    require(
        APPOINTMENT_AGENT_WORKFLOW.is_file(),
        errors,
        f"missing Level-2 appointment agent: {APPOINTMENT_AGENT_WORKFLOW.relative_to(ROOT)}",
    )
    appointment_agent = load_json(APPOINTMENT_AGENT_WORKFLOW, errors) if APPOINTMENT_AGENT_WORKFLOW.is_file() else None
    if appointment_agent:
        require(
            appointment_agent.get("id") == "case002Level2AppointmentAgentV1",
            errors,
            "Level-2 appointment agent has unexpected workflow id",
        )
        meta = appointment_agent.get("meta") or {}
        require(meta.get("stage") == "CASE_HARNESS", errors, "Level-2 appointment agent stage mismatch")
        require(meta.get("artifactClass") == "CASE_COMPOSITION", errors, "Level-2 appointment agent artifact class mismatch")

        nodes = appointment_agent.get("nodes") or []
        names = {node.get("name") for node in nodes}
        required_nodes = {
            "Conversation Appointment State",
            "Send Appointment Agent Reply",
            "Verify Appointment Agent Reply",
        }
        require(required_nodes.issubset(names), errors, "Level-2 appointment agent missing required nodes")
        for node in nodes:
            require(not node.get("credentials"), errors, f"Level-2 appointment agent has bound credential on node {node.get('name')}")

        raw = APPOINTMENT_AGENT_WORKFLOW.read_text(encoding="utf-8")
        require("kapsoMessageSendV1" in raw, errors, "Level-2 appointment agent does not call hardened send adapter")
        require("America/Lima" in raw, errors, "Level-2 appointment agent timezone must be explicit")
        require("case002-level2-internal" in raw, errors, "Level-2 appointment agent must preserve sandbox calendar boundary")
        require("diagn" in raw.lower(), errors, "Level-2 appointment agent must preserve diagnosis authority boundary")
        require('"candidateVersion": "1.1.0"' in raw, errors, "Level-2 appointment agent conversational version mismatch")
        require("awaiting_service_detail" in raw, errors, "Level-2 appointment agent missing service clarification state")
        require("awaiting_operational_state" in raw, errors, "Level-2 appointment agent missing operational-state question")
        require("awaiting_preference" in raw, errors, "Level-2 appointment agent missing natural-language schedule preference state")
        require("awaiting_confirmation" in raw, errors, "Level-2 appointment agent must confirm before booking")
        require("otra hora" in raw.lower(), errors, "Level-2 appointment agent missing conversational reschedule path")

    require(
        GEMINI_INTERPRETER_WORKFLOW.is_file(),
        errors,
        f"missing Gemini interpreter workflow: {GEMINI_INTERPRETER_WORKFLOW.relative_to(ROOT)}",
    )
    gemini_interpreter = load_json(GEMINI_INTERPRETER_WORKFLOW, errors) if GEMINI_INTERPRETER_WORKFLOW.is_file() else None
    if gemini_interpreter:
        require(
            gemini_interpreter.get("id") == "case002GeminiInterpreterV1",
            errors,
            "Gemini interpreter has unexpected workflow id",
        )
        meta = gemini_interpreter.get("meta") or {}
        require(meta.get("stage") == "CASE_HARNESS", errors, "Gemini interpreter stage mismatch")
        require(meta.get("sideEffectAuthority") is False, errors, "Gemini interpreter must not have side-effect authority")
        require(meta.get("mechanicalDiagnosisAuthority") is False, errors, "Gemini interpreter must not have diagnosis authority")

        nodes = gemini_interpreter.get("nodes") or []
        names = {node.get("name") for node in nodes}
        require(
            {
                "Build Gemini Interpreter Prompt",
                "Interpret Conversation with Gemini",
                "CASE002 Gemini Chat Model",
                "CASE002 Conversation Output Parser",
                "Normalize Gemini Interpretation",
            }.issubset(names),
            errors,
            "Gemini interpreter missing required nodes",
        )
        for node in nodes:
            require(not node.get("credentials"), errors, f"Gemini interpreter has bound credential on node {node.get('name')}")

        raw = GEMINI_INTERPRETER_WORKFLOW.read_text(encoding="utf-8")
        require("@n8n/n8n-nodes-langchain.lmChatGoogleGemini" in raw, errors, "Gemini interpreter missing native Gemini chat model")
        require("@n8n/n8n-nodes-langchain.outputParserStructured" in raw, errors, "Gemini interpreter missing structured output parser")
        require("mechanicalDiagnosisProduced" in raw, errors, "Gemini interpreter missing diagnosis guard")
        require('"onError": "continueRegularOutput"' in raw, errors, "Gemini interpreter must degrade to deterministic fallback")

    require(
        CONVERSATION_AGENT_V2_WORKFLOW.is_file(),
        errors,
        f"missing Gemini conversation agent v2: {CONVERSATION_AGENT_V2_WORKFLOW.relative_to(ROOT)}",
    )
    conversation_v2 = load_json(CONVERSATION_AGENT_V2_WORKFLOW, errors) if CONVERSATION_AGENT_V2_WORKFLOW.is_file() else None
    if conversation_v2:
        require(
            conversation_v2.get("id") == "case002Level2ConversationAgentV2",
            errors,
            "Gemini conversation agent v2 has unexpected workflow id",
        )
        meta = conversation_v2.get("meta") or {}
        require(meta.get("candidateVersion") == "2.1.0", errors, "Gemini conversation agent v2 version mismatch")
        require(meta.get("policyAuthority") == "deterministic", errors, "Gemini conversation agent must preserve deterministic policy authority")
        require(meta.get("calendarAuthority") == "case002-level2-internal", errors, "Gemini conversation agent must preserve sandbox calendar boundary")

        nodes = conversation_v2.get("nodes") or []
        names = {node.get("name") for node in nodes}
        require(
            {
                "Build CASE002 Conversation Context",
                "Run CASE002 Gemini Interpreter",
                "Conversation Appointment State",
                "Send Appointment Agent Reply",
                "Verify Appointment Agent Reply",
            }.issubset(names),
            errors,
            "Gemini conversation agent v2 missing required nodes",
        )
        for node in nodes:
            require(not node.get("credentials"), errors, f"Gemini conversation agent v2 has bound credential on node {node.get('name')}")

        raw = CONVERSATION_AGENT_V2_WORKFLOW.read_text(encoding="utf-8")
        require("case002GeminiInterpreterV1" in raw, errors, "Gemini conversation agent does not call interpreter child")
        require('"onError": "continueRegularOutput"' in raw, errors, "Gemini conversation agent must preserve deterministic model fallback")
        require("$getWorkflowStaticData('global')" in raw, errors, "Gemini conversation agent must preserve Receive-owned state source")
        require("case002-level2-internal" in raw, errors, "Gemini conversation agent must not claim external calendar authority")
        require("mechanicalDiagnosisProduced" in raw, errors, "Gemini conversation agent missing diagnosis boundary")
        require("pasado manana" in raw, errors, "Gemini conversation agent missing Spanish relative-date handling")
        require("looksLikeSelection" in raw, errors, "Gemini conversation agent missing slot-selection precedence fix")
        require("session.preference && session.preference.recognized" in raw, errors, "Gemini conversation agent missing remembered scheduling preference")
        require("session.step === 'awaiting_confirmation'" in raw, errors, "Gemini conversation agent missing confirmation-state guard")
        require("toneProfile" in json.dumps(meta), errors, "Gemini conversation agent missing tone profile metadata")

    require(
        GEMINI_POC_HELPER.is_file(),
        errors,
        f"missing Gemini PoC runtime helper: {GEMINI_POC_HELPER.relative_to(ROOT)}",
    )
    if GEMINI_POC_HELPER.is_file():
        helper_raw = GEMINI_POC_HELPER.read_text(encoding="utf-8")
        require("CASE002 Gemini API" in helper_raw, errors, "Gemini PoC helper credential name mismatch")
        require("googlePalmApi" in helper_raw, errors, "Gemini PoC helper credential type mismatch")
        require("state-owner=receive" in helper_raw, errors, "Gemini PoC overlay does not assert Receive-owned state")
        require("model-fallback=deterministic" in helper_raw, errors, "Gemini PoC overlay does not assert deterministic fallback")
        require("v1beta/models" in helper_raw, errors, "Gemini PoC helper missing credential/model preflight")
        require("apiKey" in helper_raw, errors, "Gemini PoC helper missing API-key credential validation")

    require(
        APPOINTMENT_OVERLAY_HELPER.is_file(),
        errors,
        f"missing Level-2 appointment overlay helper: {APPOINTMENT_OVERLAY_HELPER.relative_to(ROOT)}",
    )
    if APPOINTMENT_OVERLAY_HELPER.is_file():
        helper_raw = APPOINTMENT_OVERLAY_HELPER.read_text(encoding="utf-8")
        require("state-owner=receive" in helper_raw, errors, "appointment overlay does not assert Receive-owned state")
        require("case002-appointment-execute-agent" in helper_raw, errors, "appointment overlay does not remove legacy child execution node")
        require("CASE002 Appointment Conversation State" in helper_raw, errors, "appointment overlay does not inline conversation state")
        require("$getWorkflowStaticData('global')" in helper_raw, errors, "appointment overlay does not verify workflow static-data persistence")

    assembly = (CASE / "assembly.yaml").read_text(encoding="utf-8") if (CASE / "assembly.yaml").is_file() else ""
    require("Kapso" in assembly and "OpenWA" in assembly, errors, "assembly adapter preference missing")
    require("KAPSO_MESSAGE_RECEIVE@1.0" in assembly, errors, "assembly does not bind Kapso receive package")
    require("KAPSO_MEDIA_DOWNLOAD@1.0" in assembly, errors, "assembly does not bind Kapso media package")
    require("KAPSO_MESSAGE_SEND@1.0" in assembly, errors, "assembly does not bind Kapso send package")
    require("READY_TO_TEST_MOCK" in assembly, errors, "assembly is not marked READY_TO_TEST_MOCK")

    require((ROOT / "workflows/adapters/messaging/KAPSO-WHATSAPP.md").is_file(), errors, "Kapso adapter spec missing")
    require((ROOT / "workflows/adapters/messaging/OPENWA-WHATSAPP.md").is_file(), errors, "OpenWA adapter spec missing")
    require((CASE / "TESTING.md").is_file(), errors, "CASE-002 testing runbook missing")
    require((CASE / "runtime/case002-acceptance-probe.json").is_file(), errors, "CASE-002 n8n acceptance probe missing")

    return errors


def main() -> int:
    errors = validate()
    if errors:
        print("CASE-002 READINESS: FAIL")
        for error in errors:
            print(f"- {error}")
        return 1
    print("CASE-002 READINESS: PASS")
    print(f"Contracts: {len(CONTRACTS)}")
    print(f"Acceptance fixtures: {len(EXPECTED_FIXTURES)}")
    print(f"Kapso HARDENED adapters: {len(KAPSO_PACKAGES)}")
    print("Level-2 media evidence composition source: PASS")
    print("Level-2 appointment agent source: PASS")
    print("Gemini semantic interpreter source: PASS")
    print("Hybrid Gemini conversation agent v2 source: PASS")
    print("Provider-neutral case contracts: PASS")
    print("No bound adapter credentials / no base64 workflow serialization: PASS")
    print("Boundary: ready for mock/runtime testing; not a production certification.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
