"""Try the prototype app with the real agents (demo mode only).

GET  /app                 the prototype page, wired to the ElevenLabs agents
GET  /app/assets/{name}   its pictures and videos
POST /demo/start          a fictional resident and an open call session; returns a short-lived page key
POST /demo/bind           binds the ElevenLabs conversation id to that session
GET  /demo/status         tells the page when the agent asks for the location
POST /demo/location       the person's answer; only the distance to the nearest center is kept
GET  /demo/plan           what was booked (center, time, ride, preferences), for the app screens

Nothing here exists unless AOUN_DEMO_MODE=1. The resident is invented, no name or number of a real
person is used, and nothing personal is ever sent to ElevenLabs.
"""
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel, ConfigDict, Field

from . import link
from .db import _PATTERN, DISTRICT_AR
from .security import hash_token, new_id, secrets_token
from .tools import RIYADH, _ride_view, km, label_ar, place_hold, time_ar

router = APIRouter()
STATIC = Path(__file__).parent / "static"
DEMO_DISTRICT = "Al-Naseem"
KEY_MINUTES = 30
MAX_LIVE = 40           # live demo sessions kept in memory at once
STARTS_PER_MINUTE = 6   # simple global brake on /demo/start
LOCATION_WAIT_SECONDS = 18  # under the 20 s tool timeout

PAGE_CSP = ("default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; "
            "img-src 'self' data: blob:; media-src 'self' blob: data:; "
            "connect-src 'self' https://api.elevenlabs.io wss://api.elevenlabs.io https://*.elevenlabs.io wss://*.elevenlabs.io "
            "https://*.livekit.cloud wss://*.livekit.cloud; worker-src 'self' blob:")


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class StartIn(Strict):
    voice: str = Field(default="f", pattern=r"^[fm]$")
    lang: str = Field(default="ar", pattern=r"^(ar|en|ur|hi|bn|fil|id)$")
    p: str | None = Field(default=None, min_length=20, max_length=120)  # the app's patient token: call about this person


class BindIn(Strict):
    k: str = Field(min_length=20, max_length=80)
    conversation_id: str = Field(min_length=6, max_length=100, pattern=r"^[A-Za-z0-9_\-]+$")


class LocationIn(Strict):
    k: str = Field(min_length=20, max_length=80)
    allow: bool
    lat: float | None = Field(default=None, ge=-90, le=90)
    lon: float | None = Field(default=None, ge=-180, le=180)


def _registry(request: Request) -> dict:
    reg = getattr(request.app.state, "demo_sessions", None)
    if reg is None:
        reg = request.app.state.demo_sessions = {}
        request.app.state.demo_keys = {}
        request.app.state.demo_starts = []
    return reg


def _require_demo(request: Request):
    if not request.app.state.settings.demo_mode:
        raise HTTPException(404)


def _prune(request: Request):
    reg = _registry(request)
    keys = request.app.state.demo_keys
    cutoff = time.time() - KEY_MINUTES * 60
    for kh, call_id in list(keys.items()):
        if reg.get(call_id, {}).get("created", 0) < cutoff:
            keys.pop(kh, None)
            reg.pop(call_id, None)


def _by_key(request: Request, k: str) -> tuple[str, dict]:
    _require_demo(request)
    _prune(request)
    call_id = request.app.state.demo_keys.get(hash_token(k))
    if call_id is None:
        raise HTTPException(403, "demo_key_invalid")
    return call_id, _registry(request)[call_id]


# ---------- the page ----------

@router.get("/app", response_class=HTMLResponse)
def app_page(request: Request):
    _require_demo(request)
    path = STATIC / "aoun-app.html"
    if not path.exists():
        raise HTTPException(404)
    return HTMLResponse(path.read_text(encoding="utf-8"), headers={
        "Content-Security-Policy": PAGE_CSP,
        "Permissions-Policy": "microphone=(self), geolocation=(self)",
    })


@router.get("/app/assets/{name}")
def app_asset(name: str, request: Request):
    _require_demo(request)
    if not all(ch.isalnum() or ch in "._-" for ch in name) or ".." in name or len(name) > 80:
        raise HTTPException(404)
    path = STATIC / "assets" / name
    if not path.is_file():
        raise HTTPException(404)
    return FileResponse(path, headers={"Cache-Control": "public, max-age=86400"})


# ---------- the demo session ----------

@router.post("/demo/start")
def demo_start(body: StartIn, request: Request):
    _require_demo(request)
    _prune(request)
    reg = _registry(request)
    now_s = time.time()
    starts = [t for t in request.app.state.demo_starts if t > now_s - 60]
    if len(starts) >= STARTS_PER_MINUTE or len(reg) >= MAX_LIVE:
        raise HTTPException(429, "busy_try_again_soon")
    starts.append(now_s)
    request.app.state.demo_starts = starts

    db = request.app.state.db
    st = request.app.state.settings
    vault = request.app.state.vault
    now = datetime.now(timezone.utc)
    call_id = new_id("call")
    agent = "rafeed" if body.voice == "m" else "rufaida"
    from .patient import open_case, resident_by_token
    person = resident_by_token(db, body.p) if body.p else None
    if body.p and person is None:
        raise HTTPException(401, "unauthorized")
    with db.tx() as c:
        if person is None:
            # A fictional resident: no name, an invented number, the language picked on the page.
            rid = "R9" + secrets_token()[:6].upper().replace("-", "X").replace("_", "Y")
            cid = "C9" + str(int(now_s * 1000))[-6:]
            c.execute("INSERT INTO residents (id,district,age_band,language,phone_enc,contact_permission) VALUES (?,?,?,?,?,?)",
                      (rid, DEMO_DISTRICT, "45-54", body.lang, vault.encrypt("+966500000199"), 1))
            c.execute("INSERT INTO cases (id,resident_id,screening,due,due_date,cohort_entry) VALUES (?,?,?,?,?,?)",
                      (cid, rid, "diabetes", 1, "2026-10-20", "2026-10-20"))
            district = DEMO_DISTRICT
        else:
            cid = open_case(db, person["id"])["id"]
            district = person["district"]
            c.execute("UPDATE residents SET language = ? WHERE id = ?", (body.lang, person["id"]))
        # Every demo starts from the same open times as the prototype.
        for suf, *_rest in _PATTERN:
            places = _rest[3]
            c.execute("UPDATE slots SET remaining = MAX(remaining, ?) WHERE id = ?", (places, f"S2{suf}"))
        c.execute("""INSERT INTO call_sessions (id, conv_hash, case_id, agent, language, created_at, expires_at)
                     VALUES (?,?,?,?,?,?,?)""",
                  (call_id, None, cid, agent, body.lang, now.isoformat(), (now + timedelta(minutes=KEY_MINUTES)).isoformat()))
        link.record_case(c, cid, "contacted")
        demo_now = datetime.fromisoformat(st.demo_now) if st.demo_now else now.astimezone(RIYADH)
        if not c.execute("SELECT 1 FROM bookings WHERE case_id = ? AND status = 'confirmed'", (cid,)).fetchone():
            place_hold(c, call_id, cid, district, "diabetes", demo_now)
    k = secrets_token()
    request.app.state.demo_keys[hash_token(k)] = call_id
    reg[call_id] = {"created": now_s, "location": "idle"}
    return {"k": k, "agent_id": st.agent_rafeed if agent == "rafeed" else st.agent_rufaida}


@router.post("/demo/bind")
def demo_bind(body: BindIn, request: Request):
    call_id, _ = _by_key(request, body.k)
    db = request.app.state.db
    with db.tx() as c:
        row = c.execute("SELECT conv_hash FROM call_sessions WHERE id = ?", (call_id,)).fetchone()
        if row["conv_hash"] is None:
            c.execute("UPDATE call_sessions SET conv_hash = ? WHERE id = ?", (hash_token(body.conversation_id), call_id))
    return {"ok": True}


@router.get("/demo/status")
def demo_status(k: str, request: Request):
    _, entry = _by_key(request, k)
    return {"location": entry["location"]}


@router.post("/demo/location")
def demo_location(body: LocationIn, request: Request):
    call_id, entry = _by_key(request, body.k)
    if entry["location"] != "asked":
        raise HTTPException(409, "not_asked")
    if body.allow and body.lat is not None and body.lon is not None:
        db = request.app.state.db
        centers = db.all("SELECT DISTINCT lat, lon FROM slots WHERE lat != 0")
        nearest = min(km(body.lat, body.lon, r["lat"], r["lon"]) for r in centers) if centers else None
        if nearest is not None:
            with db.tx() as c:
                c.execute("UPDATE call_sessions SET distance_km = ? WHERE id = ?", (round(nearest, 1), call_id))
    entry["location"] = "allowed" if body.allow else "refused"
    del body  # coordinates are not stored or logged anywhere
    return {"ok": True}


@router.get("/demo/plan")
def demo_plan(k: str, request: Request):
    call_id, _ = _by_key(request, k)
    db = request.app.state.db
    from .patient import plan_for_case
    s = db.one("SELECT case_id, language FROM call_sessions WHERE id = ?", call_id)
    out = plan_for_case(db, s["case_id"], call_id)
    out["language"] = s["language"]
    return out


# ---------- used by the send_location_link tool ----------

def ask_in_app(request: Request, call_id: str) -> str | None:
    """For a demo session opened from the app page: show the phone's location prompt and wait for
    the answer. Returns 'allowed', 'refused', or None when the session is not a demo app session."""
    reg = getattr(request.app.state, "demo_sessions", None) or {}
    entry = reg.get(call_id)
    if entry is None:
        return None
    entry["location"] = "asked"
    deadline = time.time() + LOCATION_WAIT_SECONDS
    while time.time() < deadline:
        if entry["location"] in ("allowed", "refused"):
            return entry["location"]
        time.sleep(0.3)
    entry["location"] = "idle"
    return "refused"
