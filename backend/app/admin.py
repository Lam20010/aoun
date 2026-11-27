"""Staff/admin routes (separate key). Starting a call is the ONLY place a phone number is decrypted."""
from datetime import datetime, timedelta, timezone
from enum import Enum

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from .security import hash_token, mask_phone, new_id, require_admin_key
from .tools import RIYADH, place_hold

router = APIRouter(prefix="/admin", dependencies=[Depends(require_admin_key)])

ELEVENLABS_OUTBOUND_URL = "https://api.elevenlabs.io/v1/convai/twilio/outbound-call"


class Voice(str, Enum):
    rafeed = "rafeed"
    rufaida = "rufaida"


class StartCallIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    case_id: str = Field(pattern=r"^C\d{2,6}$")
    voice: Voice = Voice.rufaida
    dry_run: bool = True  # True = open the session for a dashboard/web test (demo mode); no phone call
    conversation_id: str | None = Field(default=None, min_length=6, max_length=100, pattern=r"^[A-Za-z0-9_\-]+$")


def _open_session(request: Request, case_id: str, voice: Voice, conversation_id: str | None):
    db = request.app.state.db
    st = request.app.state.settings
    row = db.one("""SELECT c.id, c.status, c.due, c.screening, r.district, r.language, r.phone_enc, r.contact_permission
                    FROM cases c JOIN residents r ON r.id = c.resident_id WHERE c.id = ?""", case_id)
    if row is None:
        raise HTTPException(404, "case_not_found")
    if not row["contact_permission"]:
        raise HTTPException(409, "contact_not_permitted")
    if not row["due"] or row["status"] in ("booked", "completed", "closed"):
        raise HTTPException(409, "case_not_eligible_for_outreach")
    now = datetime.now(timezone.utc)
    call_id = new_id("call")
    with db.tx() as c:
        c.execute("""INSERT INTO call_sessions (id, conv_hash, case_id, agent, language, created_at, expires_at)
                     VALUES (?,?,?,?,?,?,?)""",
                  (call_id, hash_token(conversation_id) if conversation_id else None, case_id, voice.value, row["language"], now.isoformat(),
                   (now + timedelta(minutes=st.token_ttl_minutes)).isoformat()))
        c.execute("INSERT INTO events VALUES (?,?,?,?,?,?,?)",
                  (new_id("ev"), case_id, None, "call_started", "admin", voice.value, now.isoformat()))
        demo_now = datetime.fromisoformat(st.demo_now) if st.demo_now else now.astimezone(RIYADH)
        place_hold(c, call_id, case_id, row["district"], row["screening"], demo_now)
    return call_id, row


@router.post("/calls")
def start_call(body: StartCallIn, request: Request):
    st = request.app.state.settings
    call_id, row = _open_session(request, body.case_id, body.voice, body.conversation_id)
    phone = request.app.state.vault.decrypt(row["phone_enc"])
    agent_id = st.agent_rafeed if body.voice == Voice.rafeed else st.agent_rufaida

    if body.dry_run:
        # For a dashboard/web test: start the test conversation within 15 minutes (needs AOUN_DEMO_MODE=1).
        return {"call_id": call_id, "language": row["language"],
                "to": mask_phone(phone), "dry_run": True}

    if not (st.elevenlabs_api_key and st.phone_number_id):
        raise HTTPException(503, "outbound_calling_not_configured")
    payload = {
        "agent_id": agent_id,
        "agent_phone_number_id": st.phone_number_id,
        "to_number": phone,
        "conversation_initiation_client_data": {
            # Only the language goes to ElevenLabs. No name, no ID, no condition.
            "conversation_config_override": {"agent": {"language": row["language"]}},
        },
    }
    r = httpx.post(ELEVENLABS_OUTBOUND_URL, json=payload,
                   headers={"xi-api-key": st.elevenlabs_api_key}, timeout=20)
    if r.status_code >= 300:
        raise HTTPException(502, "call_provider_error")
    conv = (r.json() or {}).get("conversation_id")
    if conv:  # bind the conversation so its tool calls resolve to this case
        with request.app.state.db.tx() as c:
            c.execute("UPDATE call_sessions SET conv_hash = ? WHERE id = ?", (hash_token(conv), call_id))
    return {"call_id": call_id, "to": mask_phone(phone), "language": row["language"], "dry_run": False}


@router.get("/due_queue")
def due_queue(request: Request):
    """Contactable due cases, longest overdue first. Masked phones only."""
    db = request.app.state.db
    rows = db.all("""SELECT c.id AS case_id, c.due_date, r.district, r.language, r.phone_enc
                     FROM cases c JOIN residents r ON r.id = c.resident_id
                     WHERE c.due = 1 AND c.status = 'open' AND r.contact_permission = 1
                     ORDER BY c.due_date""")
    vault = request.app.state.vault
    return {"queue": [{"case_id": r["case_id"], "due_date": r["due_date"], "district": r["district"],
                       "language": r["language"], "phone": mask_phone(vault.decrypt(r["phone_enc"]))}
                      for r in rows]}
