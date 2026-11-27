"""Staff/admin routes (separate key). Starting a call is the ONLY place a phone number is decrypted."""
from datetime import datetime, timedelta, timezone
from enum import Enum

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from .security import hash_token, mask_phone, new_call_token, new_id, require_admin_key

router = APIRouter(prefix="/admin", dependencies=[Depends(require_admin_key)])

ELEVENLABS_OUTBOUND_URL = "https://api.elevenlabs.io/v1/convai/twilio/outbound-call"


class Voice(str, Enum):
    rafeed = "rafeed"
    rufaida = "rufaida"


class StartCallIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    case_id: str = Field(pattern=r"^C\d{2,6}$")
    voice: Voice = Voice.rufaida
    dry_run: bool = True  # True = create the session and return the token for dashboard testing; no phone call


def _open_session(request: Request, case_id: str, voice: Voice):
    db = request.app.state.db
    st = request.app.state.settings
    row = db.one("""SELECT c.id, c.status, c.due, r.language, r.phone_enc, r.contact_permission
                    FROM cases c JOIN residents r ON r.id = c.resident_id WHERE c.id = ?""", case_id)
    if row is None:
        raise HTTPException(404, "case_not_found")
    if not row["contact_permission"]:
        raise HTTPException(409, "contact_not_permitted")
    if not row["due"] or row["status"] in ("booked", "completed", "closed"):
        raise HTTPException(409, "case_not_eligible_for_outreach")
    token = new_call_token()
    now = datetime.now(timezone.utc)
    call_id = new_id("call")
    with db.tx() as c:
        c.execute("""INSERT INTO call_sessions (id, token_hash, case_id, agent, language, created_at, expires_at)
                     VALUES (?,?,?,?,?,?,?)""",
                  (call_id, hash_token(token), case_id, voice.value, row["language"], now.isoformat(),
                   (now + timedelta(minutes=st.token_ttl_minutes)).isoformat()))
        c.execute("INSERT INTO events VALUES (?,?,?,?,?,?,?)",
                  (new_id("ev"), case_id, None, "call_started", "admin", voice.value, now.isoformat()))
    return call_id, token, row


@router.post("/calls")
def start_call(body: StartCallIn, request: Request):
    st = request.app.state.settings
    call_id, token, row = _open_session(request, body.case_id, body.voice)
    phone = request.app.state.vault.decrypt(row["phone_enc"])
    agent_id = st.agent_rafeed if body.voice == Voice.rafeed else st.agent_rufaida

    if body.dry_run:
        # For testing in the ElevenLabs dashboard: paste this token as the call_token dynamic variable.
        return {"call_id": call_id, "call_token": token, "language": row["language"],
                "to": mask_phone(phone), "dry_run": True}

    if not (st.elevenlabs_api_key and st.phone_number_id):
        raise HTTPException(503, "outbound_calling_not_configured")
    payload = {
        "agent_id": agent_id,
        "agent_phone_number_id": st.phone_number_id,
        "to_number": phone,
        "conversation_initiation_client_data": {
            # Only the opaque token and the language go to ElevenLabs. No name, no ID, no condition.
            "dynamic_variables": {"call_token": token},
            "conversation_config_override": {"agent": {"language": row["language"]}},
        },
    }
    r = httpx.post(ELEVENLABS_OUTBOUND_URL, json=payload,
                   headers={"xi-api-key": st.elevenlabs_api_key}, timeout=20)
    if r.status_code >= 300:
        raise HTTPException(502, "call_provider_error")
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
