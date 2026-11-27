"""Tools the voice agents (Rafeed and Rufaida) call, in the order the conversation uses them:

  1. get_appointment         read the appointment already held for this person
  2. confirm_booking         confirm the held appointment, or a chosen alternative
  3. record_barrier          if they say no: save the ONE main reason (fixed code)
  4. send_location_link      with consent, text a one-time link to share location
  5. get_solutions           options that remove their reason (evening, mobile clinic, ride, ...)
  6. request_transport       a ride or a metro plan for the booked appointment
  7. request_nurse_callback  for fear or medical questions
  8. opt_out                 never call again

Design rules:
- Every request needs the shared tool key (X-Aoun-Key) AND a conversation bound to a call the server started.
- The conversation id is filled in by ElevenLabs itself (system__conversation_id), never by the language model.
- Inputs are fixed choices wherever possible, so nothing a caller says is stored as text.
- Responses carry only what the agent needs to say: no names, IDs, phone numbers or conditions.
"""
import math
from datetime import datetime, timedelta, timezone
from enum import Enum

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from .security import hash_token, new_id, require_tool_key, secrets_token

RIYADH = timezone(timedelta(hours=3))
MAX_TOOL_CALLS_PER_CALL = 40
MAX_OPTIONS = 3
LOCATION_LINK_MINUTES = 30
DEMO_CLAIM_MINUTES = 15

router = APIRouter(prefix="/tools", dependencies=[Depends(require_tool_key)])

AR_DAYS = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"]
AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو",
             "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]


# ---------- request models (strict: unknown fields are rejected) ----------

class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")
    conversation_id: str = Field(min_length=6, max_length=100, pattern=r"^[A-Za-z0-9_\-]+$")


class Empty(Strict):
    pass


class Reason(str, Enum):
    transport = "transport"              # no car / far away
    work_hours = "work_hours"            # work or the time does not suit
    fear = "fear"                        # afraid of the test or the result
    no_need = "no_need"                  # "I have no symptoms"
    needs_companion = "needs_companion"  # needs a companion / mahram
    embarrassment = "embarrassment"      # feels embarrassed
    cost_concern = "cost_concern"        # thinks it costs money
    language = "language"
    childcare = "childcare"              # no one to look after children or dependants
    other = "other"


class RecordBarrierIn(Strict):
    reason: Reason


class SolutionsIn(Strict):
    reason: Reason


class ConfirmIn(Strict):
    choice: str = Field(pattern=r"^(held|of_[0-9a-f]{12})$")


class TransportMode(str, Enum):
    ride = "ride"
    metro = "metro"


class TransportIn(Strict):
    mode: TransportMode


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


def label_ar(start_iso: str) -> str:
    d = datetime.fromisoformat(start_iso).astimezone(RIYADH)
    hour = d.hour % 12 or 12
    period = "الصبح" if d.hour < 12 else ("العصر" if d.hour < 17 else "المساء")
    minutes = f":{d.minute:02d}" if d.minute else ""
    return f"{AR_DAYS[d.weekday()]} {d.day} {AR_MONTHS[d.month - 1]}، الساعة {hour}{minutes} {period}"


def km(lat1, lon1, lat2, lon2) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _session(request: Request, conversation_id: str):
    """Resolve the live call session bound to this ElevenLabs conversation.

    Real calls are bound when the server places them. In demo mode only, a test conversation
    (dashboard or web page) may claim the newest unbound session opened by staff in the last
    15 minutes. Every problem returns the same 403."""
    db = request.app.state.db
    ch = hash_token(conversation_id)
    row = db.one("SELECT * FROM call_sessions WHERE conv_hash = ?", ch)
    if row is None and request.app.state.settings.demo_mode:
        cutoff = (_now_utc() - timedelta(minutes=DEMO_CLAIM_MINUTES)).isoformat()
        with db.tx() as c:
            cand = c.execute("""SELECT id FROM call_sessions WHERE conv_hash IS NULL AND status = 'active'
                                AND created_at >= ? ORDER BY created_at DESC LIMIT 1""", (cutoff,)).fetchone()
            if cand:
                c.execute("UPDATE call_sessions SET conv_hash = ? WHERE id = ?", (ch, cand["id"]))
        row = db.one("SELECT * FROM call_sessions WHERE conv_hash = ?", ch)
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


def _case(db, case_id):
    return db.one("""SELECT c.*, r.district, r.contact_permission, r.phone_enc
                     FROM cases c JOIN residents r ON r.id = c.resident_id WHERE c.id = ?""", case_id)


def _slot_view(r) -> dict:
    return {"center": r["center"], "when": label_ar(r["start_local"]),
            "mobile_clinic": r["kind"] == "mobile_clinic", "female_staff": bool(r["female_staff"]),
            "companion_welcome": bool(r["companion_ok"]), "transport_available": bool(r["transport"])}


def place_hold(c, call_id: str, case_id: str, district: str, screening: str, now: datetime) -> bool:
    """Hold the earliest open center slot for this case when the call starts (used by /admin/calls)."""
    for r in c.execute("""SELECT * FROM slots WHERE district = ? AND screening = ? AND kind = 'center'
                          AND remaining > 0 ORDER BY start_local""", (district, screening)).fetchall():
        if datetime.fromisoformat(r["start_local"]) <= now:
            continue
        if c.execute("UPDATE slots SET remaining = remaining - 1 WHERE id = ? AND remaining > 0",
                     (r["id"],)).rowcount == 1:
            c.execute("INSERT INTO holds VALUES (?,?,?,?,?,?)",
                      (new_id("hd"), call_id, case_id, r["id"], "held",
                       (_now_utc() + timedelta(hours=48)).isoformat()))
            return True
    return False


# What each reason gets offered. Filters run over open future slots in the person's district.
SOLUTIONS = {
    Reason.work_hours: ("Evening or weekend appointments.",
                        lambda s, d: d.hour >= 17 or d.weekday() in (4, 5)),
    Reason.transport: ("A mobile clinic close to home, or a center with a free ride.",
                       lambda s, d: s["kind"] == "mobile_clinic" or s["transport"]),
    Reason.childcare: ("A mobile clinic close to home, or an evening time.",
                       lambda s, d: s["kind"] == "mobile_clinic" or d.hour >= 17),
    Reason.needs_companion: ("Appointments where a companion is welcome, with two places together.",
                             lambda s, d: s["companion_ok"]),
    Reason.embarrassment: ("Appointments with female staff and a private room.",
                           lambda s, d: s["female_staff"]),
    Reason.fear: ("Keep the appointment, and a nurse calls first to explain and reassure.", None),
    Reason.no_need: ("Keep the appointment: early screening finds issues before any symptoms appear.", None),
    Reason.cost_concern: ("Keep the appointment: the screening is completely free.", None),
    Reason.language: ("Keep the appointment: an interpreter in their language will be at the center.", None),
    Reason.other: ("The next open times.", lambda s, d: True),
}


# ---------- tools ----------

@router.post("/get_appointment")
def get_appointment(body: Empty, request: Request):
    s = _session(request, body.conversation_id)
    db = request.app.state.db
    h = db.one("""SELECT h.status, sl.* FROM holds h JOIN slots sl ON sl.id = h.slot_id
                  WHERE h.call_id = ?""", s["id"])
    if h is None or h["status"] != "held":
        return {"held": False, "message": "No appointment is held. Ask what time suits them and use get_solutions with reason other."}
    return {"held": True, **_slot_view(h),
            "message": "Tell them this appointment is held for them and ask if they confirm it."}


@router.post("/confirm_booking")
def confirm_booking(body: ConfirmIn, request: Request):
    s = _session(request, body.conversation_id)
    db = request.app.state.db
    with db.tx() as c:
        if c.execute("SELECT 1 FROM bookings WHERE case_id = ? AND status = 'confirmed'",
                     (s["case_id"],)).fetchone():
            b = c.execute("""SELECT b.id, sl.* FROM bookings b JOIN slots sl ON sl.id = b.slot_id
                             WHERE b.case_id = ? AND b.status = 'confirmed'""", (s["case_id"],)).fetchone()
            return {"status": "confirmed", "booking_ref": b["id"], **_slot_view(b), "replayed": True}
        hold = c.execute("SELECT * FROM holds WHERE call_id = ?", (s["id"],)).fetchone()

        if body.choice == "held":
            if hold is None or hold["status"] != "held":
                raise HTTPException(409, "no_held_appointment: offer solutions instead")
            slot_id, offer_id = hold["slot_id"], "held_" + hold["id"]
            c.execute("UPDATE holds SET status = 'confirmed' WHERE id = ?", (hold["id"],))
        else:
            offer = c.execute("SELECT * FROM offers WHERE id = ? AND call_id = ?", (body.choice, s["id"])).fetchone()
            if offer is None:  # only options offered in THIS call can be booked
                raise HTTPException(409, "option_not_found: call get_solutions again")
            if c.execute("UPDATE slots SET remaining = remaining - 1 WHERE id = ? AND remaining > 0",
                         (offer["slot_id"],)).rowcount != 1:
                raise HTTPException(409, "slot_taken: apologise and offer another option")
            if hold is not None and hold["status"] == "held":  # give the held place back
                c.execute("UPDATE slots SET remaining = remaining + 1 WHERE id = ?", (hold["slot_id"],))
                c.execute("UPDATE holds SET status = 'released' WHERE id = ?", (hold["id"],))
            slot_id, offer_id = offer["slot_id"], offer["id"]

        bid = new_id("bk")
        c.execute("INSERT INTO bookings VALUES (?,?,?,?,?,?)",
                  (bid, s["case_id"], slot_id, offer_id, "confirmed", _now_utc().isoformat()))
        c.execute("UPDATE cases SET status = 'booked' WHERE id = ?", (s["case_id"],))
        c.execute("UPDATE call_sessions SET outcome = 'booked' WHERE id = ?", (s["id"],))
        _event(c, s["case_id"], "booking_confirmed", booking_id=bid)
        slot = c.execute("SELECT * FROM slots WHERE id = ?", (slot_id,)).fetchone()
    return {"status": "confirmed", "booking_ref": bid, **_slot_view(slot)}


@router.post("/record_barrier")
def record_barrier(body: RecordBarrierIn, request: Request):
    s = _session(request, body.conversation_id)
    db = request.app.state.db
    case = _case(db, s["case_id"])
    with db.tx() as c:
        c.execute("""INSERT INTO barriers VALUES (?,?,?,?,?)
                     ON CONFLICT(call_id) DO UPDATE SET reason = excluded.reason""",
                  (s["id"], s["case_id"], case["district"], body.reason.value, _now_utc().isoformat()))
        _event(c, s["case_id"], "barrier_reported", detail=body.reason.value)
    return {"status": "recorded", "message": "Now ask for consent to share location, then call get_solutions."}


@router.post("/send_location_link")
def send_location_link(body: Empty, request: Request):
    """Text a one-time link. Opening it asks the phone for permission; the server keeps only the
    distance to the nearest center and discards the coordinates."""
    s = _session(request, body.conversation_id)
    st = request.app.state.settings
    db = request.app.state.db
    code = secrets_token()
    with db.tx() as c:
        c.execute("INSERT INTO location_links VALUES (?,?,?,0)",
                  (hash_token(code), s["id"], (_now_utc() + timedelta(minutes=LOCATION_LINK_MINUTES)).isoformat()))
    sent = False
    if st.sms_ready and st.public_base_url:
        phone = request.app.state.vault.decrypt(_case(db, s["case_id"])["phone_enc"])
        text = f"عون - وزارة الصحة: لمشاركة موقعك مرة وحدة اضغط {st.public_base_url}/l/{code}"
        try:
            r = httpx.post(f"https://api.twilio.com/2010-04-01/Accounts/{st.twilio_sid}/Messages.json",
                           data={"To": phone, "From": st.twilio_from, "Body": text},
                           auth=(st.twilio_sid, st.twilio_token), timeout=10)
            sent = r.status_code < 300
        except httpx.HTTPError:
            sent = False
    request.app.state.last_location_code = code  # for local demos and tests only; never returned to the agent
    if sent:
        return {"sent": True, "message": "Tell them a text message has arrived; they tap it and allow location. Continue meanwhile."}
    return {"sent": False, "message": "The link could not be sent. Do not mention it again; continue with get_solutions."}


@router.post("/get_solutions")
def get_solutions(body: SolutionsIn, request: Request):
    s = _session(request, body.conversation_id)
    db = request.app.state.db
    case = _case(db, s["case_id"])
    if not case["contact_permission"]:
        raise HTTPException(status_code=403, detail="call_not_active")
    plan, rule = SOLUTIONS[body.reason]
    fresh = db.one("SELECT distance_km FROM call_sessions WHERE id = ?", s["id"])
    distance = fresh["distance_km"]
    now = _demo_now(request)

    held = db.one("""SELECT sl.* FROM holds h JOIN slots sl ON sl.id = h.slot_id
                     WHERE h.call_id = ? AND h.status = 'held'""", s["id"])
    picked = []
    if rule is not None:
        rows = db.all("""SELECT * FROM slots WHERE district = ? AND screening = ? AND remaining > 0
                         ORDER BY start_local""", case["district"], case["screening"])
        for r in rows:
            d = datetime.fromisoformat(r["start_local"])
            if d <= now or (held is not None and r["id"] == held["id"]) or not rule(r, d):
                continue
            picked.append(r)
        if body.reason in (Reason.transport, Reason.childcare) and distance is not None:
            picked.sort(key=lambda r: (r["kind"] != "mobile_clinic", r["start_local"]))
        picked = picked[:MAX_OPTIONS]

    options = []
    with db.tx() as c:
        if rule is None and held is not None:
            options.append({"choice": "held", **_slot_view(held)})
        for r in picked:
            oid = new_id("of")
            c.execute("INSERT INTO offers VALUES (?,?,?,?)", (oid, s["id"], r["id"], _now_utc().isoformat()))
            options.append({"choice": oid, **_slot_view(r)})
    extras = []
    if body.reason == Reason.transport:
        extras.append("After booking, offer a free ride (request_transport mode ride) or a Riyadh Metro plan (mode metro).")
    if body.reason == Reason.fear:
        extras.append("Offer a nurse call before the appointment (request_nurse_callback topic fear).")
    return {
        "plan": plan,
        "options": options,
        "location_shared": distance is not None,
        "nearest_center_km": round(distance, 1) if distance is not None else None,
        "extras": extras,
        "message": ("Explain the plan simply, read back the option(s), and wait for a clear yes before "
                    "calling confirm_booking with that option's choice value.") if options else
                   "No matching times. Offer a nurse callback or a call back later.",
    }


@router.post("/request_transport")
def request_transport(body: TransportIn, request: Request):
    s = _session(request, body.conversation_id)
    db = request.app.state.db
    with db.tx() as c:
        b = c.execute("""SELECT b.id, sl.transport, sl.kind FROM bookings b JOIN slots sl ON sl.id = b.slot_id
                         WHERE b.case_id = ? AND b.status = 'confirmed'""", (s["case_id"],)).fetchone()
        if b is None:
            raise HTTPException(409, "no_booking: confirm an appointment first")
        if body.mode == TransportMode.metro:
            status = "metro_plan_sent"
        else:
            status = "ride_requested" if b["transport"] else "ride_unavailable"
        c.execute("""INSERT INTO support_requests VALUES (?,?,?,?)
                     ON CONFLICT(booking_id) DO UPDATE SET kind = excluded.kind, status = excluded.status""",
                  (new_id("sr"), b["id"], body.mode.value, status))
        _event(c, s["case_id"], "transport_" + status, booking_id=b["id"])
    return {"transport_status": status}


@router.post("/request_nurse_callback")
def request_nurse_callback(body: NurseCallbackIn, request: Request):
    s = _session(request, body.conversation_id)
    db = request.app.state.db
    with db.tx() as c:
        c.execute("INSERT INTO tasks VALUES (?,?,?,?,?,?)",
                  (new_id("tk"), s["case_id"], "nurse_callback", body.topic.value,
                   (_now_utc() + timedelta(hours=1)).isoformat(), "pending"))
        _event(c, s["case_id"], "nurse_callback_requested", detail=body.topic.value)
    return {"status": "scheduled", "callback": "within one hour"}


@router.post("/opt_out")
def opt_out(body: Empty, request: Request):
    s = _session(request, body.conversation_id)
    db = request.app.state.db
    with db.tx() as c:
        c.execute("""UPDATE residents SET contact_permission = 0
                     WHERE id = (SELECT resident_id FROM cases WHERE id = ?)""", (s["case_id"],))
        c.execute("UPDATE tasks SET state = 'cancelled' WHERE case_id = ? AND state = 'pending'", (s["case_id"],))
        hold = c.execute("SELECT * FROM holds WHERE call_id = ? AND status = 'held'", (s["id"],)).fetchone()
        if hold:
            c.execute("UPDATE slots SET remaining = remaining + 1 WHERE id = ?", (hold["slot_id"],))
            c.execute("UPDATE holds SET status = 'released' WHERE id = ?", (hold["id"],))
        c.execute("UPDATE call_sessions SET outcome = 'opted_out' WHERE id = ?", (s["id"],))
        _event(c, s["case_id"], "opted_out")
    return {"status": "opted_out", "message": "Confirm kindly that they will not be called again, then say goodbye."}
