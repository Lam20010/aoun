"""ElevenLabs post-call webhook.

Only signed requests are accepted. From the payload we keep ONE thing: which call ended.
Transcripts, audio, summaries and analysis are ignored and never written anywhere.
"""
import json

from fastapi import APIRouter, HTTPException, Request

from .security import hash_token, verify_webhook_signature

router = APIRouter(prefix="/webhooks")


@router.post("/elevenlabs/post-call")
async def post_call(request: Request):
    raw = await request.body()
    secret = request.app.state.settings.webhook_secret
    if not verify_webhook_signature(secret, request.headers.get("ElevenLabs-Signature", ""), raw):
        raise HTTPException(status_code=401, detail="bad_signature")
    try:
        payload = json.loads(raw)
    except ValueError:
        raise HTTPException(status_code=400, detail="bad_json")

    data = payload.get("data") or {}
    conv = data.get("conversation_id")
    if not isinstance(conv, str):
        return {"ok": True}  # nothing to link; drop it

    outcome_if_none = "no_answer" if payload.get("type") == "call_initiation_failure" else "ended"
    db = request.app.state.db
    with db.tx() as c:
        c.execute("""UPDATE call_sessions SET status = 'ended', outcome = COALESCE(outcome, ?)
                     WHERE conv_hash = ?""", (outcome_if_none, hash_token(conv)))
    # Deliberately discard everything else in the payload.
    del payload, data
    return {"ok": True}
