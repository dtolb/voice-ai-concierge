#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = ["httpx>=0.28", "python-dotenv>=1.0", "truststore>=0.10"]
# ///
"""Idempotent provisioner for the HVAC concierge demo's Twilio objects.

Owns, by name: a Memory Store and its HvacService trait group, the "HVAC Lead
Qualification" language operator, an Intelligence v3 configuration, a Conversation
Orchestrator configuration, and the phone number's voice webhooks. Each run finds
every object by display name, creates what is missing, and updates what drifted
from the spec below.

State lives in provision/: state.json (ids, applied spec, spec hash per object) and
requests.jsonl (every HTTP request and response). Resolved ids are written to .env.

Usage:
    uv run scripts/provision.py plan
    uv run scripts/provision.py apply [--public-host HOST] [--force]
    uv run scripts/provision.py status
    uv run scripts/provision.py reset [--calls]
    uv run scripts/provision.py destroy --yes
"""

from __future__ import annotations

import argparse
import hashlib
import json
import ssl
import sys
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
import truststore
from dotenv import dotenv_values, set_key

ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / ".env"
STATE_DIR = ROOT / "provision"
STATE_PATH = STATE_DIR / "state.json"
LOG_PATH = STATE_DIR / "requests.jsonl"

DEFAULT_PUBLIC_HOST = "hvac-concierge.twilio.dtolb.com"
PREFIX = "hvac-concierge"

MEMORY = "https://memory.twilio.com"
CONVERSATIONS = "https://conversations.twilio.com"
INTELLIGENCE = "https://intelligence.twilio.com"
CORE = "https://api.twilio.com/2010-04-01"
MESSAGING = "https://messaging.twilio.com"

STORE_NAME = f"{PREFIX}-memory"
TRAIT_GROUP_NAME = "HvacService"
OPERATOR_NAME = "HVAC Lead Qualification"
INTEL_CONFIG_NAME = f"{PREFIX}-intelligence"
CONV_CONFIG_NAME = PREFIX

HVAC_TRAITS: dict[str, dict[str, Any]] = {
    "reasonForCalling": {"dataType": "STRING", "description": "Why the customer called, in one sentence."},
    "serviceType": {
        "dataType": "STRING",
        "description": "REPLACEMENT, REPAIR, MAINTENANCE, INSTALLATION, QUOTE or OTHER.",
    },
    "serviceAddress": {"dataType": "STRING", "description": "Full service address as confirmed with the caller."},
    "addressConfirmed": {"dataType": "BOOLEAN", "description": "True once the caller confirmed the read-back address."},
    "purchaseInterest": {"dataType": "STRING", "description": "Perceived buying interest: HIGH, MEDIUM or LOW."},
    "purchaseInterestRationale": {"dataType": "STRING", "description": "Why the interest level was chosen."},
    "urgency": {"dataType": "STRING", "description": "EMERGENCY, SOON or FLEXIBLE."},
    "lastCallSid": {"dataType": "STRING", "description": "Call SID of the most recent call."},
}

LEAD_OPERATOR_PROMPT = """You analyze a phone call between a customer and the AI concierge of an HVAC \
(heating, ventilation and air conditioning) company.

Extract the lead details the business needs to follow up:
- customerName: the caller's full name as they gave it. Empty string if never given.
- serviceAddress: the full service address (street, city, state, postal code) in one line. Empty string if never given.
- addressConfirmed: true only if the agent read the address back and the caller agreed it was correct.
- reasonForCalling: one sentence, in plain words, on why the customer called.
- serviceType: the kind of work requested.
- urgency: EMERGENCY if there is no heat or cooling in extreme weather, a gas smell, or a safety risk; SOON if they want it within days; FLEXIBLE otherwise.
- purchaseInterest: how likely the caller is to buy. HIGH if they asked about pricing, financing or scheduling an install, or said they are ready to replace; MEDIUM if they are open but comparing options or want a quote first; LOW if they are only asking questions or pushing back on cost.
- purchaseInterestRationale: one sentence quoting or paraphrasing what the caller said that supports the interest level.
- nextStep: the follow-up the business should take, in one short sentence.

Use UNKNOWN for an enum the conversation gives no evidence for. Never invent details the caller did not say."""

LEAD_OPERATOR_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "customerName": {"type": "string"},
        "serviceAddress": {"type": "string"},
        "addressConfirmed": {"type": "boolean"},
        "reasonForCalling": {"type": "string"},
        "serviceType": {
            "type": "string",
            "enum": ["REPLACEMENT", "REPAIR", "MAINTENANCE", "INSTALLATION", "QUOTE", "OTHER", "UNKNOWN"],
        },
        "urgency": {"type": "string", "enum": ["EMERGENCY", "SOON", "FLEXIBLE", "UNKNOWN"]},
        "purchaseInterest": {"type": "string", "enum": ["HIGH", "MEDIUM", "LOW", "UNKNOWN"]},
        "purchaseInterestRationale": {"type": "string"},
        "nextStep": {"type": "string"},
    },
}


class ProvisionError(RuntimeError):
    """Raised when a Twilio request fails or an async operation does not complete."""


@dataclass
class Settings:
    """Credentials and identifiers read from .env and the command line."""

    account_sid: str
    api_key: str
    api_secret: str
    phone_number: str
    public_host: str


class Twilio:
    """Thin HTTP client that logs every request to requests.jsonl."""

    def __init__(self, settings: Settings, dry_run: bool) -> None:
        self.settings = settings
        self.dry_run = dry_run
        self.http = httpx.Client(
            auth=(settings.api_key, settings.api_secret),
            timeout=30,
            verify=truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT),
        )

    def request(
        self,
        method: str,
        url: str,
        *,
        json_body: Any = None,
        form: dict[str, str] | None = None,
        params: dict[str, Any] | None = None,
        ok_404: bool = False,
    ) -> httpx.Response | None:
        """Sends a request, logs it, and raises ProvisionError on a non-2xx status.

        Returns None for a 404 when ok_404 is set. In dry-run mode, mutating requests
        are logged as skipped and return None.
        """
        mutating = method in {"POST", "PUT", "PATCH", "DELETE"}
        entry: dict[str, Any] = {
            "at": datetime.now(UTC).isoformat(),
            "method": method,
            "url": url,
            "params": params,
            "body": json_body if json_body is not None else form,
        }
        if mutating and self.dry_run:
            entry["skipped"] = "dry-run"
            _log(entry)
            return None
        response = self.http.request(method, url, json=json_body, data=form, params=params)
        entry["status"] = response.status_code
        try:
            entry["response"] = response.json()
        except ValueError:
            entry["response"] = response.text[:2000]
        _log(entry)
        if response.status_code == 404 and ok_404:
            return None
        if response.status_code >= 400:
            raise ProvisionError(f"{method} {url} -> {response.status_code}: {response.text[:800]}")
        return response

    def get(self, url: str, **kwargs: Any) -> Any:
        """GETs a URL and returns the decoded JSON body, or None on an allowed 404."""
        response = self.request("GET", url, **kwargs)
        return None if response is None else response.json()

    def paged(self, url: str, key: str) -> list[dict[str, Any]]:
        """Collects every item under `key` from a pageToken-paginated control-plane list."""
        items: list[dict[str, Any]] = []
        token: str | None = None
        while True:
            params: dict[str, Any] = {"pageSize": 50}
            if token:
                params["pageToken"] = token
            body = self.get(url, params=params)
            items.extend(body.get(key) or [])
            token = (body.get("meta") or {}).get("nextToken")
            if not token:
                return items

    def wait(self, response: httpx.Response | None, what: str, timeout_s: int = 180) -> None:
        """Polls the statusUrl of an async control-plane operation until it completes."""
        if response is None:
            return
        body = response.json() if response.content else {}
        status_url = body.get("statusUrl") or response.headers.get("Location")
        if not status_url:
            return
        deadline = time.monotonic() + timeout_s
        while time.monotonic() < deadline:
            op = self.get(status_url)
            status = str(op.get("status", "")).upper()
            if status in {"COMPLETED", "SUCCEEDED", "SUCCESS"}:
                return
            if status in {"FAILED", "ERROR", "CANCELED", "CANCELLED"}:
                raise ProvisionError(f"{what} failed: {json.dumps(op)[:800]}")
            time.sleep(2)
        raise ProvisionError(f"{what} did not complete within {timeout_s}s ({status_url})")


def _log(entry: dict[str, Any]) -> None:
    STATE_DIR.mkdir(exist_ok=True)
    with LOG_PATH.open("a") as f:
        f.write(json.dumps(entry, default=str) + "\n")


def _hash(spec: Any) -> str:
    return hashlib.sha256(json.dumps(spec, sort_keys=True).encode()).hexdigest()[:16]


def load_state() -> dict[str, Any]:
    """Reads provision/state.json, or an empty state if none exists."""
    return json.loads(STATE_PATH.read_text()) if STATE_PATH.exists() else {}


def save_state(state: dict[str, Any]) -> None:
    """Writes provision/state.json."""
    STATE_DIR.mkdir(exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, indent=2, sort_keys=True) + "\n")


def record(state: dict[str, Any], key: str, obj_id: str, spec: Any, action: str) -> None:
    """Stores an object's id, applied spec and spec hash under `key` in the state."""
    state[key] = {
        "id": obj_id,
        "specHash": _hash(spec),
        "spec": spec,
        "lastAction": action,
        "at": datetime.now(UTC).isoformat(),
    }


def needs_update(state: dict[str, Any], key: str, spec: Any, force: bool) -> bool:
    """True when the spec differs from the one last applied, or when forced."""
    return force or state.get(key, {}).get("specHash") != _hash(spec)


def find_store(tw: Twilio) -> dict[str, Any] | None:
    """Finds the demo's Memory Store by display name."""
    for store_id in tw.paged(f"{MEMORY}/v1/ControlPlane/Stores", "stores"):
        store = tw.get(f"{MEMORY}/v1/ControlPlane/Stores/{store_id}", ok_404=True)
        if store and store.get("displayName") == STORE_NAME:
            return store
    return None


def ensure_store(tw: Twilio, state: dict[str, Any], plan: list[str]) -> str | None:
    """Creates the Memory Store if missing. Returns its id, or None in a dry run."""
    spec = {"displayName": STORE_NAME, "description": "HVAC concierge demo memory store"}
    store = find_store(tw)
    if store:
        plan.append(f"memory store        unchanged  {store['id']}")
        record(state, "memoryStore", store["id"], spec, "found")
        return store["id"]
    plan.append(f"memory store        CREATE     {STORE_NAME}")
    tw.wait(tw.request("POST", f"{MEMORY}/v1/ControlPlane/Stores", json_body=spec), "memory store create")
    if tw.dry_run:
        return None
    store = find_store(tw)
    if not store:
        raise ProvisionError("memory store created but not found by name")
    record(state, "memoryStore", store["id"], spec, "created")
    return store["id"]


def ensure_trait_group(tw: Twilio, state: dict[str, Any], store_id: str | None, plan: list[str], force: bool) -> None:
    """Creates the HvacService trait group, or adds traits it is missing."""
    spec = {
        "displayName": TRAIT_GROUP_NAME,
        "description": "HVAC service request details captured by the concierge.",
        "traits": HVAC_TRAITS,
    }
    if store_id is None:
        plan.append(f"trait group         CREATE     {TRAIT_GROUP_NAME}")
        return
    base = f"{MEMORY}/v1/ControlPlane/Stores/{store_id}/TraitGroups"
    live = tw.get(f"{base}/{TRAIT_GROUP_NAME}", params={"includeTraits": "true"}, ok_404=True)
    if live is None:
        plan.append(f"trait group         CREATE     {TRAIT_GROUP_NAME}")
        tw.wait(tw.request("POST", base, json_body=spec), "trait group create")
        record(state, "traitGroup", TRAIT_GROUP_NAME, spec, "created")
        return
    live_traits = (live.get("traitGroup") or live).get("traits") or {}
    missing = {k: v for k, v in HVAC_TRAITS.items() if k not in live_traits}
    if missing or force and needs_update(state, "traitGroup", spec, force):
        plan.append(f"trait group         UPDATE     {TRAIT_GROUP_NAME} (+{', '.join(missing) or 'none'})")
        if missing:
            tw.wait(
                tw.request("PATCH", f"{base}/{TRAIT_GROUP_NAME}", json_body={"traits": missing}),
                "trait group update",
            )
        record(state, "traitGroup", TRAIT_GROUP_NAME, spec, "updated")
        return
    plan.append(f"trait group         unchanged  {TRAIT_GROUP_NAME}")
    record(state, "traitGroup", TRAIT_GROUP_NAME, spec, "found")


def list_operators(tw: Twilio) -> list[dict[str, Any]]:
    """Returns every language operator visible to the account."""
    return tw.paged(f"{INTELLIGENCE}/v3/ControlPlane/Operators", "items")


def twilio_operator_id(operators: list[dict[str, Any]], name: str) -> str:
    """Returns the id of the Twilio-authored operator with the given display name."""
    for op in operators:
        if op.get("author") == "TWILIO" and op.get("displayName") == name:
            return op["id"]
    raise ProvisionError(f"Twilio-authored operator {name!r} not found")


def ensure_operator(tw: Twilio, state: dict[str, Any], operators: list[dict[str, Any]], plan: list[str], force: bool) -> str | None:
    """Creates or updates the custom lead-qualification operator. Returns its id."""
    spec = {
        "displayName": OPERATOR_NAME,
        "description": "Extracts HVAC lead details and perceived purchase interest from a call.",
        "author": "SELF",
        "outputFormat": "JSON",
        "outputSchema": LEAD_OPERATOR_SCHEMA,
        "prompt": LEAD_OPERATOR_PROMPT,
        "context": {"memory": {"enabled": True}, "knowledge": {"enabled": False}},
    }
    live = next((o for o in operators if o.get("author") == "SELF" and o.get("displayName") == OPERATOR_NAME), None)
    if live is None:
        plan.append(f"lead operator       CREATE     {OPERATOR_NAME}")
        response = tw.request("POST", f"{INTELLIGENCE}/v3/ControlPlane/Operators", json_body=spec)
        if response is None:
            return None
        op_id = response.json()["id"]
        record(state, "leadOperator", op_id, spec, "created")
        return op_id
    if needs_update(state, "leadOperator", spec, force):
        plan.append(f"lead operator       UPDATE     {live['id']}")
        body = {**spec, "version": live.get("version")}
        tw.request("PUT", f"{INTELLIGENCE}/v3/ControlPlane/Operators/{live['id']}", json_body=body)
        record(state, "leadOperator", live["id"], spec, "updated")
    else:
        plan.append(f"lead operator       unchanged  {live['id']}")
        record(state, "leadOperator", live["id"], spec, "found")
    return live["id"]


def find_intel_config(tw: Twilio) -> dict[str, Any] | None:
    """Finds the demo's Intelligence configuration by display name."""
    configs = tw.paged(f"{INTELLIGENCE}/v3/ControlPlane/Configurations", "items")
    return next((c for c in configs if c.get("displayName") == INTEL_CONFIG_NAME), None)


def ensure_intel_config(
    tw: Twilio,
    state: dict[str, Any],
    operators: list[dict[str, Any]],
    lead_operator_id: str | None,
    plan: list[str],
    force: bool,
) -> str | None:
    """Creates or updates the Intelligence configuration. Returns its id."""
    webhook = [{"type": "WEBHOOK", "method": "POST", "url": f"https://{tw.settings.public_host}/webhooks/intelligence"}]
    sentiment = twilio_operator_id(operators, "Sentiment")
    summary = twilio_operator_id(operators, "Summary")
    rules = [
        {
            "operators": [{"id": sentiment}],
            "triggers": [{"on": "COMMUNICATION", "parameters": {"count": 1}}],
            "actions": webhook,
        },
        {
            "operators": [{"id": summary}, {"id": sentiment}, {"id": lead_operator_id or "pending-lead-operator"}],
            "triggers": [{"on": "CONVERSATION_END"}],
            "actions": webhook,
            "context": {"memory": {"enabled": True}},
        },
    ]
    spec = {
        "displayName": INTEL_CONFIG_NAME,
        "description": "HVAC concierge: live sentiment per utterance; summary, sentiment and lead qualification at call end.",
        "rules": rules,
    }
    live = find_intel_config(tw)
    if live is None:
        plan.append(f"intelligence config CREATE     {INTEL_CONFIG_NAME}")
        response = tw.request("POST", f"{INTELLIGENCE}/v3/ControlPlane/Configurations", json_body=spec)
        if response is None:
            return None
        config_id = response.json().get("id") or (find_intel_config(tw) or {}).get("id")
        if not config_id:
            raise ProvisionError("intelligence config created but not found by name")
        record(state, "intelligenceConfig", config_id, spec, "created")
        return config_id
    if needs_update(state, "intelligenceConfig", spec, force):
        plan.append(f"intelligence config UPDATE     {live['id']}")
        live_rules = live.get("rules") or []
        body_rules = [
            {**rule, "id": live_rules[i]["id"]} if i < len(live_rules) else rule for i, rule in enumerate(rules)
        ]
        tw.request(
            "PUT",
            f"{INTELLIGENCE}/v3/ControlPlane/Configurations/{live['id']}",
            json_body={**spec, "rules": body_rules},
        )
        record(state, "intelligenceConfig", live["id"], spec, "updated")
    else:
        plan.append(f"intelligence config unchanged  {live['id']}")
        record(state, "intelligenceConfig", live["id"], spec, "found")
    return live["id"]


def find_conv_config(tw: Twilio) -> dict[str, Any] | None:
    """Finds the demo's Conversation Orchestrator configuration by display name."""
    configs = tw.paged(f"{CONVERSATIONS}/v2/ControlPlane/Configurations", "configurations")
    return next((c for c in configs if c.get("displayName") == CONV_CONFIG_NAME), None)


def ensure_conv_config(
    tw: Twilio,
    state: dict[str, Any],
    store_id: str | None,
    intel_config_id: str | None,
    plan: list[str],
    force: bool,
) -> str | None:
    """Creates or fully replaces the Orchestrator configuration. Returns its id."""
    number = tw.settings.phone_number
    spec = {
        "displayName": CONV_CONFIG_NAME,
        "description": "HVAC concierge demo: voice via ConversationRelay, SMS via capture rules.",
        "conversationGroupingType": "GROUP_BY_PROFILE",
        "memoryStoreId": store_id or "pending-memory-store",
        "memoryExtractionEnabled": True,
        "intelligenceConfigurationIds": [intel_config_id] if intel_config_id else [],
        "channelSettings": {
            "SMS": {
                "captureRules": [{"from": "*", "to": number}, {"from": number, "to": "*"}],
                "statusTimeouts": {"closed": 5},
            },
            "VOICE": {"captureRules": []},
        },
        "statusCallbacks": [{"url": f"https://{tw.settings.public_host}/webhook", "method": "POST"}],
    }
    live = find_conv_config(tw)
    if live is None:
        plan.append(f"orchestrator config CREATE     {CONV_CONFIG_NAME}")
        response = tw.request("POST", f"{CONVERSATIONS}/v2/ControlPlane/Configurations", json_body=spec)
        tw.wait(response, "orchestrator config create")
        if tw.dry_run:
            return None
        live = find_conv_config(tw)
        if not live:
            raise ProvisionError("orchestrator config created but not found by name")
        record(state, "orchestratorConfig", live["id"], spec, "created")
        return live["id"]
    if needs_update(state, "orchestratorConfig", spec, force):
        plan.append(f"orchestrator config UPDATE     {live['id']} (full replace)")
        response = tw.request("PUT", f"{CONVERSATIONS}/v2/ControlPlane/Configurations/{live['id']}", json_body=spec)
        tw.wait(response, "orchestrator config update")
        record(state, "orchestratorConfig", live["id"], spec, "updated")
    else:
        plan.append(f"orchestrator config unchanged  {live['id']}")
        record(state, "orchestratorConfig", live["id"], spec, "found")
    return live["id"]


def find_number(tw: Twilio) -> dict[str, Any]:
    """Returns the IncomingPhoneNumber resource for TWILIO_PHONE_NUMBER."""
    body = tw.get(
        f"{CORE}/Accounts/{tw.settings.account_sid}/IncomingPhoneNumbers.json",
        params={"PhoneNumber": tw.settings.phone_number},
    )
    numbers = body.get("incoming_phone_numbers") or []
    if not numbers:
        raise ProvisionError(f"{tw.settings.phone_number} is not on this account")
    return numbers[0]


def ensure_number(tw: Twilio, state: dict[str, Any], plan: list[str]) -> str:
    """Points the number's voice webhooks at the app. Returns the number's SID."""
    host = tw.settings.public_host
    spec = {
        "VoiceUrl": f"https://{host}/twiml",
        "VoiceMethod": "POST",
        "StatusCallback": f"https://{host}/twilio/call-events/status",
        "StatusCallbackMethod": "POST",
    }
    number = find_number(tw)
    live = {
        "VoiceUrl": number.get("voice_url"),
        "VoiceMethod": number.get("voice_method"),
        "StatusCallback": number.get("status_callback"),
        "StatusCallbackMethod": number.get("status_callback_method"),
    }
    if live != spec or number.get("voice_application_sid"):
        plan.append(f"phone number        UPDATE     {number['phone_number']} voice -> {spec['VoiceUrl']}")
        tw.request(
            "POST",
            f"{CORE}/Accounts/{tw.settings.account_sid}/IncomingPhoneNumbers/{number['sid']}.json",
            form={**spec, "VoiceApplicationSid": ""},
        )
        record(state, "phoneNumber", number["sid"], spec, "updated")
    else:
        plan.append(f"phone number        unchanged  {number['phone_number']}")
        record(state, "phoneNumber", number["sid"], spec, "found")
    return number["sid"]


def find_messaging_service(tw: Twilio, number_sid: str) -> str | None:
    """Returns the SID of the Messaging Service whose sender pool holds the number."""
    services = tw.get(f"{MESSAGING}/v1/Services", params={"PageSize": 50}).get("services") or []
    for service in services:
        pool = tw.get(f"{MESSAGING}/v1/Services/{service['sid']}/PhoneNumbers", params={"PageSize": 50})
        if any(p.get("sid") == number_sid for p in pool.get("phone_numbers") or []):
            return service["sid"]
    return None


def write_env(values: dict[str, str | None]) -> None:
    """Writes resolved ids into .env, leaving every other line untouched."""
    for key, value in values.items():
        if value:
            set_key(str(ENV_PATH), key, value, quote_mode="never")


def load_settings(public_host: str | None) -> Settings:
    """Reads credentials and the phone number from .env."""
    env = dotenv_values(ENV_PATH)
    missing = [k for k in ("TWILIO_ACCOUNT_SID", "TWILIO_API_KEY", "TWILIO_API_SECRET", "TWILIO_PHONE_NUMBER") if not env.get(k)]
    if missing:
        raise ProvisionError(f".env is missing {', '.join(missing)}")
    number = env["TWILIO_PHONE_NUMBER"] or ""
    return Settings(
        account_sid=env["TWILIO_ACCOUNT_SID"] or "",
        api_key=env["TWILIO_API_KEY"] or "",
        api_secret=env["TWILIO_API_SECRET"] or "",
        phone_number=number if number.startswith("+") else f"+{number}",
        public_host=public_host or env.get("TWILIO_VOICE_PUBLIC_DOMAIN") or DEFAULT_PUBLIC_HOST,
    )


def cmd_apply(settings: Settings, dry_run: bool, force: bool) -> None:
    """Brings every owned object in line with the spec; with dry_run, only reports."""
    tw = Twilio(settings, dry_run=dry_run)
    state = load_state()
    plan: list[str] = []
    store_id = ensure_store(tw, state, plan)
    ensure_trait_group(tw, state, store_id, plan, force)
    operators = list_operators(tw)
    lead_id = ensure_operator(tw, state, operators, plan, force)
    intel_id = ensure_intel_config(tw, state, operators, lead_id, plan, force)
    conv_id = ensure_conv_config(tw, state, store_id, intel_id, plan, force)
    number_sid = ensure_number(tw, state, plan)
    messaging_sid = find_messaging_service(tw, number_sid)

    print(("PLAN (no changes made)" if dry_run else "APPLIED") + f" — public host {settings.public_host}")
    for line in plan:
        print("  " + line)
    if dry_run:
        return
    state["publicHost"] = settings.public_host
    state["messagingServiceSid"] = messaging_sid
    save_state(state)
    write_env(
        {
            "TWILIO_PHONE_NUMBER": settings.phone_number,
            "TWILIO_MESSAGING_SERVICE_SID": messaging_sid,
            "TWILIO_MEMORY_STORE_ID": store_id,
            "TWILIO_CONVERSATION_CONFIGURATION_ID": conv_id,
            "TWILIO_ORCHESTRATOR_CONFIG_ID": conv_id,
            "TWILIO_INTELLIGENCE_CONFIG_ID": intel_id,
            "TWILIO_LEAD_OPERATOR_ID": lead_id,
            "TWILIO_VOICE_PUBLIC_DOMAIN": settings.public_host,
        }
    )
    print(f"\nstate  -> {STATE_PATH.relative_to(ROOT)}\nlog    -> {LOG_PATH.relative_to(ROOT)}\n.env   -> ids written")


def cmd_status(settings: Settings) -> None:
    """Prints the live state of every owned object."""
    tw = Twilio(settings, dry_run=True)
    store = find_store(tw)
    print(f"memory store        {store['id'] if store else 'MISSING'}")
    if store:
        group = tw.get(
            f"{MEMORY}/v1/ControlPlane/Stores/{store['id']}/TraitGroups/{TRAIT_GROUP_NAME}",
            params={"includeTraits": "true"},
            ok_404=True,
        )
        traits = sorted(((group or {}).get("traitGroup") or {}).get("traits") or {})
        print(f"trait group         {TRAIT_GROUP_NAME if group else 'MISSING'} {traits}")
    operators = list_operators(tw)
    lead = next((o for o in operators if o.get("displayName") == OPERATOR_NAME), None)
    print(f"lead operator       {lead['id'] + ' v' + str(lead.get('version')) if lead else 'MISSING'}")
    intel = find_intel_config(tw)
    print(f"intelligence config {intel['id'] + ' v' + str(intel.get('version')) if intel else 'MISSING'}")
    conv = find_conv_config(tw)
    print(f"orchestrator config {conv['id'] + ' v' + str(conv.get('version')) if conv else 'MISSING'}")
    number = find_number(tw)
    print(f"phone number        {number['phone_number']} voice_url={number.get('voice_url')}")


def cmd_reset(settings: Settings, clear_calls: bool) -> None:
    """Deletes every profile in the demo's Memory Store; with clear_calls, also empties the app's call history."""
    tw = Twilio(settings, dry_run=False)
    store = find_store(tw)
    if not store:
        raise ProvisionError("memory store not found; run apply first")
    profiles = tw.paged(f"{MEMORY}/v1/Stores/{store['id']}/Profiles", "profiles")
    for profile_id in profiles:
        tw.request("DELETE", f"{MEMORY}/v1/Stores/{store['id']}/Profiles/{profile_id}")
    print(f"deleted {len(profiles)} profile(s) from {store['id']}")
    if clear_calls:
        response = httpx.delete(f"https://{settings.public_host}/api/calls", timeout=15, verify=truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT))
        response.raise_for_status()
        print(f"cleared {response.json()['cleared']} call(s) from the app's history")


def cmd_destroy(settings: Settings) -> None:
    """Deletes every owned object except the phone number, whose voice URL is cleared."""
    tw = Twilio(settings, dry_run=False)
    state = load_state()
    conv = find_conv_config(tw)
    if conv:
        tw.wait(tw.request("DELETE", f"{CONVERSATIONS}/v2/ControlPlane/Configurations/{conv['id']}"), "orchestrator delete")
        print(f"deleted orchestrator config {conv['id']}")
    intel = find_intel_config(tw)
    if intel:
        tw.request("DELETE", f"{INTELLIGENCE}/v3/ControlPlane/Configurations/{intel['id']}")
        print(f"deleted intelligence config {intel['id']}")
    lead = next((o for o in list_operators(tw) if o.get("author") == "SELF" and o.get("displayName") == OPERATOR_NAME), None)
    if lead:
        tw.request("DELETE", f"{INTELLIGENCE}/v3/ControlPlane/Operators/{lead['id']}")
        print(f"deleted lead operator {lead['id']}")
    store = find_store(tw)
    if store:
        tw.wait(tw.request("DELETE", f"{MEMORY}/v1/ControlPlane/Stores/{store['id']}"), "memory store delete")
        print(f"deleted memory store {store['id']}")
    number = find_number(tw)
    tw.request(
        "POST",
        f"{CORE}/Accounts/{settings.account_sid}/IncomingPhoneNumbers/{number['sid']}.json",
        form={"VoiceUrl": "", "StatusCallback": ""},
    )
    print(f"cleared voice webhooks on {number['phone_number']}")
    for key in ("memoryStore", "traitGroup", "leadOperator", "intelligenceConfig", "orchestratorConfig"):
        state.pop(key, None)
    save_state(state)


def main() -> None:
    """Parses arguments and runs the chosen command."""
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    for name, help_text in (("plan", "show what apply would change"), ("apply", "create or update everything")):
        p = sub.add_parser(name, help=help_text)
        p.add_argument("--public-host", help=f"public host for webhooks (default: .env or {DEFAULT_PUBLIC_HOST})")
        p.add_argument("--force", action="store_true", help="re-apply every spec even if unchanged")
    sub.add_parser("status", help="show the live state of every owned object")
    r = sub.add_parser("reset", help="delete every Memory profile in the demo store")
    r.add_argument("--calls", action="store_true", help="also clear the call history in data/database.json")
    d = sub.add_parser("destroy", help="delete every owned object")
    d.add_argument("--yes", action="store_true", help="confirm deletion")
    args = parser.parse_args()

    try:
        settings = load_settings(getattr(args, "public_host", None))
        if args.command == "plan":
            cmd_apply(settings, dry_run=True, force=args.force)
        elif args.command == "apply":
            cmd_apply(settings, dry_run=False, force=args.force)
        elif args.command == "status":
            cmd_status(settings)
        elif args.command == "reset":
            cmd_reset(settings, clear_calls=args.calls)
        elif args.command == "destroy":
            if not args.yes:
                sys.exit("destroy deletes the demo's Twilio objects; pass --yes to confirm")
            cmd_destroy(settings)
    except ProvisionError as exc:
        sys.exit(f"error: {exc}")


if __name__ == "__main__":
    main()
