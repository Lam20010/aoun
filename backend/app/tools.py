"""The six tools the voice agents (Rafeed and Rufaida) can call.

Design rules:
- Every request needs the shared tool key (X-Aoun-Key) AND a live call token.
- The call token comes from the conversation's dynamic variables, not from the language model.
- Inputs are fixed choices (enums) wherever possible, so nothing a caller says is stored as text.
- Responses carry only what the agent needs to say: no names, IDs, phone numbers or conditions.
"""
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from .security import hash_token, new_id, require_tool_key

RIYADH = timezone(timedelta(hours=3))
MAX_TOOL_CALLS_PER_CALL = 40
MAX_OPTIONS = 3

router = APIRouter(prefix="/tools", dependencies=[Depends(require_tool_key)])

AR_DAYS = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"]
AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو",
             "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]


# ---------- request models (strict: unknown fields are rejected) ----------

class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")
    call_token: str = Field(min_length=10, max_length=80)


class TimeOfDay(str, Enum):
    morning = "morning"
    afternoon = "afternoon"
    evening = "evening"
    any = "any"


class Weekday(str, Enum):
    any = "any"
    sunday = "sunday"
    monday = "monday"
    tuesday = "tuesday"
    wednesday = "wednesday"
    thursday = "thursday"
    friday = "friday"
    saturday = "saturday"


class SearchSlotsIn(Strict):
    time_of_day: TimeOfDay = TimeOfDay.any
    weekday: Weekday = Weekday.any
    needs_step_free: bool = False


class ConfirmBookingIn(Strict):
    offer_id: str = Field(pattern=r"^of_[0-9a-f]{12}$")


class Reason(str, Enum):
    transport = "transport"
    work_hours = "work_hours"
    fear = "fear"
    no_need = "no_need"
    language = "language"
    childcare = "childcare"
    other = "other"


class RecordBarrierIn(Strict):
    reason: Reason


class Empty(Strict):
    pass


class NurseTopic(str, Enum):
    fear = "fear"
    medical_question = "medical_question"
    wants_human = "wants_human"


class NurseCallbackIn(Strict):
    topic: NurseTopic


# ---------- helpers ----------

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _demo_now(request: Request) -> datetime:
    s = request.app.state.settings.demo_now
    return datetime.fromisoformat(s) if s else _now_utc().astimezone(RIYADH)


def _label_ar(start_iso: str) -> str:
    d = datetime.fromisoformat(start_iso).astimezone(RIYADH)
    hour = d.hour % 12 or 12
    period = "الصبح" if d.hour < 12 else ("العصر" if d.hour < 17 else "المساء")
    minutes = f":{d.minute:02d}" if d.minute else ""
    return f"{AR_DAYS[d.weekday()]} {d.day} {AR_MONTHS[d.month - 1]}، الساعة {hour}{minutes} {period}"


def _session(request: Request, token: str):
    """Resolve the live call session from the token. Any problem returns the same 403,
    so a caller cannot learn whether a token ever existed."""
    db = request.app.state.db
    row = db.one("SELECT * FROM call_sessions WHERE token_hash = ?", hash_token(token))
    if (row is None or row["status"] != "active"
            or datetime.fromisoformat(row["expires_at"]) < _now_utc()
            or row["tool_calls"] >= MAX_TOOL_CALLS_PER_CALL):
        raise HTTPException(status_code=403, detail="call_not_active")
    with db.tx() as c:
        c.execute("UPDATE call_sessions SET tool_calls = tool_calls + 1 WHERE id = ?", (row["id"],))
    return row


def _event(c, case_id, type_, source="voice_agent", booking_id=None, detail=None):
    c.execute("INSERT INTO events VALUES (?,?,?,?,?,?,?)",
              (new_id("ev"), case_id, booking_id, type_, source, detail, _now_utc().isoformat()))


def _case_and_resident(db, case_id):
    return db.one("""SELECT c.*, r.district, r.contact_permission
                     FROM cases c JOIN residents r ON r.id = c.resident_id WHERE c.id = ?""", case_id)


# ---------- tools ----------

@router.post("/search_slots")
def search_slots(body: SearchSlotsIn, request: Request):
    s = _session(request, body.call_token)
    db = request.app.state.db
    case = _case_and_resident(db, s["case_id"])
    if not case["contact_permission"]:
        raise HTTPException(status_code=403, detail="call_not_active")

    now = _demo_now(request)
    rows = db.all("""SELECT * FROM slots WHERE screening = ? AND district = ? AND remaining > 0
                     ORDER BY start_local""", case["screening"], case["district"])
    picked = []
    for r in rows:
        start = datetime.fromisoformat(r["start_local"])
        if start <= now:
            continue
        if body.needs_step_free and not r["step_free"]:
            continue
        if body.weekday != Weekday.any and start.strftime("%A").lower() != body.weekday.value:
            continue
        h = start.hour
        if body.time_of_day == TimeOfDay.morning and not h < 12:
            continue
        if body.time_of_day == TimeOfDay.afternoon and not 12 <= h < 17:
            continue
        if body.time_of_day == TimeOfDay.evening and not h >= 17:
            continue
        picked.append(r)
        if len(picked) == MAX_OPTIONS:
            break

    options = []
    with db.tx() as c:
        for r in picked:
            oid = new_id("of")
            c.execute("INSERT INTO offers VALUES (?,?,?,?)", (oid, s["id"], r["id"], _now_utc().isoformat()))
            options.append({
                "offer_id": oid,
                "center": r["center"],
                "when": _label_ar(r["start_local"]),
                "start_local": r["start_local"],
                "step_free": bool(r["step_free"]),
                "transport_available": bool(r["transport"]),
            })
    if not options:
        return {"options": [], "message": "no_matching_slots: offer a callback or ask for a different time"}
    return {"options": options,
            "message": "Read back the center, day and time; call confirm_booking only after a clear yes."}


@router.post("/confirm_booking")
def confirm_booking(body: ConfirmBookingIn, request: Request):
    s = _session(request, body.call_token)
    db = request.app.state.db
    with db.tx() as c:
        offer = c.execute("SELECT * FROM offers WHERE id = ? AND call_id = ?", (body.offer_id, s["id"])).fetchone()
        if offer is None:  # only offers made in THIS call can be confirmed
            raise HTTPException(status_code=409, detail="offer_not_found: search again")
        existing = c.execute("SELECT * FROM bookings WHERE offer_id = ?", (offer["id"],)).fetchone()
        slot = c.execute("SELECT * FROM slots WHERE id = ?", (offer["slot_id"],)).fetchone()
        if existing:  # retry of the same confirmation returns the same booking
            return {"status": "confirmed", "booking_ref": existing["id"],
                    "center": slot["center"], "when": _label_ar(slot["start_local"]), "replayed": True}
        active = c.execute("SELECT 1 FROM bookings WHERE case_id = ? AND status = 'confirmed'",
                           (s["case_id"],)).fetchone()
        if active:
            raise HTTPException(status_code=409, detail="already_booked")
        updated = c.execute("UPDATE slots SET remaining = remaining - 1 WHERE id = ? AND remaining > 0",
                            (slot["id"],)).rowcount
        if updated != 1:  # someone else took the last place
            raise HTTPException(status_code=409, detail="slot_taken: apologise, search again and ask again")
        bid = new_id("bk")
        c.execute("INSERT INTO bookings VALUES (?,?,?,?,?,?)",
                  (bid, s["case_id"], slot["id"], offer["id"], "confirmed", _now_utc().isoformat()))
        c.execute("UPDATE cases SET status = 'booked' WHERE id = ?", (s["case_id"],))
        c.execute("UPDATE call_sessions SET outcome = 'booked' WHERE id = ?", (s["id"],))
        _event(c, s["case_id"], "booking_confirmed", booking_id=bid)
    return {"status": "confirmed", "booking_ref": bid, "center": slot["center"], "when": _label_ar(slot["start_local"])}


@router.post("/record_barrier")
def record_barrier(body: RecordBarrierIn, request: Request):
    s = _session(request, body.call_token)
    db = request.app.state.db
    case = _case_and_resident(db, s["case_id"])
    with db.tx() as c:
        c.execute("""INSERT INTO barriers VALUES (?,?,?,?,?)
                     ON CONFLICT(call_id) DO UPDATE SET reason = excluded.reason""",
                  (s["id"], s["case_id"], case["district"], body.reason.value, _now_utc().isoformat()))
        c.execute("UPDATE call_sessions SET outcome = COALESCE(outcome, 'refused') WHERE id = ?", (s["id"],))
        _event(c, s["case_id"], "barrier_reported", detail=body.reason.value)
    return {"status": "recorded", "message": "Thank the person warmly and end the call."}


@router.post("/request_transport")
def request_transport(body: Empty, request: Request):
    s = _session(request, body.call_token)
    db = request.app.state.db
    with db.tx() as c:
        b = c.execute("""SELECT b.id, sl.transport FROM bookings b JOIN slots sl ON sl.id = b.slot_id
                         WHERE b.case_id = ? AND b.status = 'confirmed'""", (s["case_id"],)).fetchone()
        if b is None:
            raise HTTPException(status_code=409, detail="no_booking: confirm an appointment first")
        status = "requested" if b["transport"] else "unavailable"
        c.execute("""INSERT INTO support_requests VALUES (?,?,?,?)
                     ON CONFLICT(booking_id) DO UPDATE SET status = excluded.status""",
                  (new_id("sr"), b["id"], "transport", status))
        _event(c, s["case_id"], "transport_" + status, booking_id=b["id"])
    return {"transport_status": status}


@router.post("/request_nurse_callback")
def request_nurse_callback(body: NurseCallbackIn, request: Request):
    s = _session(request, body.call_token)
    db = request.app.state.db
    with db.tx() as c:
        c.execute("INSERT INTO tasks VALUES (?,?,?,?,?,?)",
                  (new_id("tk"), s["case_id"], "nurse_callback", body.topic.value,
                   (_now_utc() + timedelta(hours=1)).isoformat(), "pending"))
        _event(c, s["case_id"], "nurse_callback_requested", detail=body.topic.value)
    return {"status": "scheduled", "callback": "within one hour"}


@router.post("/opt_out")
def opt_out(body: Empty, request: Request):
    s = _session(request, body.call_token)
    db = request.app.state.db
    with db.tx() as c:
        c.execute("""UPDATE residents SET contact_permission = 0
                     WHERE id = (SELECT resident_id FROM cases WHERE id = ?)""", (s["case_id"],))
        c.execute("UPDATE tasks SET state = 'cancelled' WHERE case_id = ? AND state = 'pending'", (s["case_id"],))
        c.execute("UPDATE call_sessions SET outcome = 'opted_out' WHERE id = ?", (s["id"],))
        _event(c, s["case_id"], "opted_out")
    return {"status": "opted_out", "message": "Confirm kindly that they will not be called again, then end."}
