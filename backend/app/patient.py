"""The person's own API, used by the Aoun mobile app.

Auth: the app holds a random token (Authorization: Bearer ...). Only its SHA-256 is stored.
In demo mode the app gets a token for an invented person from POST /patient/demo.

What the person sees: their plan (center, doctor, clinic, map point), open times to book or move
their appointment, their full health record from every facility, files, doctor notes, medicines with
times, messages with their doctor, and who opened their record. Genetic results are never stored.
"""
import base64
import secrets
import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field

from . import catalog
from .translate import localize
from .security import hash_token, new_id, secrets_token
from .tools import RIYADH, _ride_view, band, label_ar, time_ar

router = APIRouter(prefix="/patient")
files_router = APIRouter()
FILE_LINK_SECONDS = 300
LANG_RE = r"^(ar|en|ur|hi|bn|fil|id)$"


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DemoIn(Strict):
    gender: str = Field(default="f", pattern=r"^[fm]$")
    lang: str = Field(default="ar", pattern=LANG_RE)
    profile: str = Field(default="citizen_insured", pattern=r"^(citizen|citizen_insured|resident_insured|resident_uninsured)$")


class ProfileIn(Strict):
    profile: str = Field(pattern=r"^(citizen|citizen_insured|resident_insured|resident_uninsured)$")


class LangIn(Strict):
    language: str = Field(pattern=LANG_RE)


class FamilyIn(Strict):
    codes: list[str] = Field(default_factory=list, max_length=len(catalog.FAMILY_HISTORY))


class BookIn(Strict):
    slot_id: str = Field(min_length=3, max_length=40, pattern=r"^[A-Za-z0-9_\-]+$")


class MessageIn(Strict):
    body: str = Field(min_length=1, max_length=1000)
    doctor_id: str | None = Field(default=None, pattern=r"^D[0-9]{2}$")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def current_patient(request: Request, authorization: str = Header(default="")):
    token = authorization.removeprefix("Bearer ").strip()
    if len(token) < 20:
        raise HTTPException(401, "unauthorized")
    row = request.app.state.db.one("""SELECT r.* FROM patient_tokens t JOIN residents r ON r.id = t.resident_id
                                      WHERE t.token_hash = ?""", hash_token(token))
    if row is None:
        raise HTTPException(401, "unauthorized")
    return row


def open_case(db, resident_id: str):
    return db.one("""SELECT * FROM cases WHERE resident_id = ? ORDER BY status = 'closed', due DESC, id DESC LIMIT 1""",
                  resident_id)


def resident_by_token(db, token: str):
    return db.one("""SELECT r.* FROM patient_tokens t JOIN residents r ON r.id = t.resident_id
                     WHERE t.token_hash = ?""", hash_token(token))


# ---------- shared views ----------

def slot_detail(slot, row=None, screening: str | None = None) -> dict:
    """Everything the app needs to show one appointment: time, place on the map, doctor, clinic."""
    d = datetime.fromisoformat(slot["start_local"]).astimezone(RIYADH)
    out = {"id": slot["id"], "iso": slot["start_local"], "when_ar": label_ar(slot["start_local"]), "time_ar": time_ar(d),
           "weekday": d.weekday(), "kind": slot["kind"], "band": band(slot), "center_ar": slot["center"],
           "district": slot["district"], "district_ar": catalog.DISTRICTS.get(slot["district"], ("",))[0],
           "lat": slot["lat"], "lon": slot["lon"], "female_staff": bool(slot["female_staff"]),
           "wheelchair": bool(slot["step_free"]), "remaining": slot["remaining"]}
    if slot["facility_id"]:
        f = catalog.facility(slot["facility_id"])
        out.update(facility_id=f["id"], center_en=f["name_en"] if slot["kind"] == "center" else
                   ("Mobile clinic by the district mosque" if slot["kind"] == "mobile_clinic" else "At your home"))
    if slot["doctor_id"]:
        doc = catalog.doctor(slot["doctor_id"])
        out["doctor"] = {k: doc[k] for k in ("id", "name_ar", "name_en", "gender", "specialty_ar", "specialty_en", "clinic_ar", "clinic_en")}
    fkind = catalog.facility(slot["facility_id"])["kind"] if slot["facility_id"] else "phc"
    out["facility_kind"] = fkind
    out["cost"] = catalog.quote(fkind, slot["kind"], screening or slot["screening"], row)
    return out


def plan_for_case(db, case_id: str, call_id: str | None = None) -> dict:
    slot = db.one("""SELECT sl.* FROM bookings b JOIN slots sl ON sl.id = b.slot_id
                     WHERE b.case_id = ? AND b.status = 'confirmed'""", case_id)
    confirmed = slot is not None
    if slot is None and call_id:
        slot = db.one("""SELECT sl.* FROM holds h JOIN slots sl ON sl.id = h.slot_id
                         WHERE h.call_id = ? AND h.status = 'held'""", call_id)
    plan = (db.one("SELECT * FROM call_plans WHERE call_id = ?", call_id) if call_id else None) or db.one(
        """SELECT p.* FROM call_plans p JOIN call_sessions s ON s.id = p.call_id
           WHERE s.case_id = ? ORDER BY s.created_at DESC LIMIT 1""", case_id)
    ride = _ride_view(plan, slot) if plan else None
    if ride and ride["mode"] == "car":
        ride["pickup_minutes"] = plan["pickup_minutes"] or 30
    case = db.one("SELECT screening, status, resident_id FROM cases WHERE id = ?", case_id)
    scr = catalog.SCREENINGS.get(case["screening"], {})
    person = db.one("SELECT * FROM residents WHERE id = ?", case["resident_id"])
    ref = db.one("SELECT sehhaty_ref FROM bookings WHERE case_id = ? AND status = 'confirmed'", case_id) if confirmed else None
    return {"confirmed": confirmed, "slot": slot_detail(slot, person, case["screening"]) if slot else None, "ride": ride,
            "sehhaty_ref": ref["sehhaty_ref"] if ref else None,
            "prefs": [p for p in ((plan["prefs"] if plan else "") or "").split(",") if p],
            "screening": case["screening"], "screening_ar": scr.get("ar", ""), "screening_en": scr.get("en", ""),
            "case_status": case["status"]}


def _two(enc: str | None, vault) -> tuple[str, str]:
    if not enc:
        return "", ""
    txt = vault.decrypt(enc)
    ar, _, en = txt.partition("|")
    return ar, en or ar


def record_view(r, vault, files: list) -> dict:
    f = catalog.facility(r["facility_id"])
    title_ar, title_en = _two(r["title_enc"], vault)
    sum_ar, sum_en = _two(r["summary_enc"], vault)
    test = None
    if r["screening"] and r["test_key"]:
        for t in catalog.SCREENINGS.get(r["screening"], {}).get("tests", []):
            if t[0] == r["test_key"]:
                test = {"low": t[4], "high": t[5]}
    doc = catalog.doctor(r["doctor_id"]) if r["doctor_id"] else None
    return {"id": r["id"], "kind": r["kind"], "screening": r["screening"], "test_key": r["test_key"], "value": r["value"],
            "unit": r["unit"], "flag": r["flag"], "range": test, "title_ar": title_ar, "title_en": title_en,
            "summary_ar": sum_ar, "summary_en": sum_en, "taken_at": r["taken_at"], "source": r["source"],
            "facility": {"id": f["id"], "kind": f["kind"], "name_ar": f["name_ar"], "name_en": f["name_en"]},
            "doctor": {"name_ar": doc["name_ar"], "name_en": doc["name_en"]} if doc else None,
            "files": [x for x in files if x["record_id"] == r["id"]]}


def full_record(db, vault, resident_id: str) -> dict:
    files = [{"id": f["id"], "record_id": f["record_id"], "filename": f["filename"], "mime": f["mime"], "size": f["size"],
              "created_at": f["created_at"], "doctor": catalog.doctor(f["doctor_id"])["name_ar"]}
             for f in db.all("SELECT id, record_id, filename, mime, size, created_at, doctor_id FROM files WHERE resident_id = ? ORDER BY created_at DESC", resident_id)]
    records = [record_view(r, vault, files) for r in
               db.all("SELECT * FROM records WHERE resident_id = ? ORDER BY taken_at DESC", resident_id)]
    notes = []
    for n in db.all("SELECT * FROM notes WHERE resident_id = ? ORDER BY created_at DESC", resident_id):
        d = catalog.doctor(n["doctor_id"])
        notes.append({"id": n["id"], "body": vault.decrypt(n["body_enc"]), "created_at": n["created_at"],
                      "doctor": {"id": d["id"], "name_ar": d["name_ar"], "name_en": d["name_en"]}})
    referrals = [{"kind": r["kind"], "created_at": r["created_at"], "doctor": catalog.doctor(r["doctor_id"])["name_ar"],
                  "doctor_en": catalog.doctor(r["doctor_id"])["name_en"]}
                 for r in db.all("SELECT * FROM referrals WHERE resident_id = ? ORDER BY created_at DESC", resident_id)]
    return {"records": records, "files": [f for f in files if not f["record_id"]], "notes": notes, "referrals": referrals}


def meds_view(db, vault, resident_id: str) -> list[dict]:
    out = []
    for m in db.all("SELECT * FROM meds WHERE resident_id = ? ORDER BY active DESC, created_at DESC", resident_id):
        name_ar, _, name_en = m["name"].partition("|")
        ins_ar, ins_en = _two(m["instructions_enc"], vault)
        doc = catalog.doctor(m["doctor_id"]) if m["doctor_id"] else None
        out.append({"id": m["id"], "kind": m["kind"], "name_ar": name_ar, "name_en": name_en or name_ar, "dose": m["dose"],
                    "times": [t for t in m["times"].split(",") if t], "days": m["days"], "start_date": m["start_date"],
                    "with_food": bool(m["with_food"]), "instructions_ar": ins_ar, "instructions_en": ins_en,
                    "active": bool(m["active"]), "facility_ar": catalog.facility(m["facility_id"])["name_ar"],
                    "facility_en": catalog.facility(m["facility_id"])["name_en"],
                    "doctor": {"name_ar": doc["name_ar"], "name_en": doc["name_en"]} if doc else None})
    return out


def my_doctors(db, resident_id: str) -> set[str]:
    """Doctors this person is booked with (now or before) or who wrote to them."""
    ids = {r["doctor_id"] for r in db.all("""SELECT sl.doctor_id FROM bookings b JOIN slots sl ON sl.id = b.slot_id
                                             JOIN cases c ON c.id = b.case_id
                                             WHERE c.resident_id = ? AND b.status IN ('confirmed','attended')""", resident_id)}
    ids |= {r["doctor_id"] for r in db.all("SELECT DISTINCT doctor_id FROM messages WHERE resident_id = ?", resident_id)}
    return {i for i in ids if i}


# ---------- routes ----------

@router.post("/demo")
def demo_patient(body: DemoIn, request: Request):
    """An invented person with a due diabetes screening in Al-Naseem and a past record from other
    facilities. Demo mode only."""
    if not request.app.state.settings.demo_mode:
        raise HTTPException(404)
    starts = [t for t in getattr(request.app.state, "patient_starts", []) if t > time.time() - 60]
    if len(starts) >= 10:
        raise HTTPException(429, "busy_try_again_soon")
    request.app.state.patient_starts = starts + [time.time()]
    from .history import seed_history

    db, vault = request.app.state.db, request.app.state.vault
    rid = "R9" + secrets_token()[:6].upper().replace("-", "X").replace("_", "Y")
    cid = "C9" + secrets_token()[:6].upper().replace("-", "X").replace("_", "Y")
    token = secrets_token() + secrets_token()
    with db.tx() as c:
        prof = catalog.DEMO_PROFILES[body.profile]
        c.execute("""INSERT INTO residents (id,district,age_band,language,phone_enc,contact_permission,gender,
                                            id_type,id_last4,insurer,insurance_class,insurance_until)
                     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                  (rid, "Al-Naseem", "45-54", body.lang, vault.encrypt("+966500000199"), 1, body.gender,
                   prof["id_type"], f"{secrets.randbelow(10000):04d}", prof["insurer"], prof["insurance_class"],
                   "2027-06-30" if prof["insurer"] else None))
        c.execute("INSERT INTO cases (id,resident_id,screening,due,due_date,cohort_entry) VALUES (?,?,?,?,?,?)",
                  (cid, rid, "diabetes", 1, "2026-10-20", "2026-10-20"))
        c.execute("INSERT INTO patient_tokens VALUES (?,?,?)", (hash_token(token), rid, _now().isoformat()))
        seed_history(c, vault, rid)
    return {"token": token, "patient": rid}


@router.patch("/sehhaty-profile")
def switch_profile(body: ProfileIn, request: Request, p=Depends(current_patient)):
    """Demo only: try the app as a citizen or resident, with or without insurance."""
    if not request.app.state.settings.demo_mode:
        raise HTTPException(404)
    prof = catalog.DEMO_PROFILES[body.profile]
    with request.app.state.db.tx() as c:
        c.execute("UPDATE residents SET id_type = ?, insurer = ?, insurance_class = ?, insurance_until = ? WHERE id = ?",
                  (prof["id_type"], prof["insurer"], prof["insurance_class"], "2027-06-30" if prof["insurer"] else None, p["id"]))
    return {"ok": True}


@router.get("/me")
def me(request: Request, p=Depends(current_patient)):
    db = request.app.state.db
    case = open_case(db, p["id"])
    fam = db.one("SELECT codes FROM family_history WHERE resident_id = ?", p["id"])
    codes = [x for x in (fam["codes"] if fam else "").split(",") if x]
    recommended = list(dict.fromkeys([case["screening"]] + [catalog.FAMILY_TO_SCREENING[c] for c in codes
                                                           if c in catalog.FAMILY_TO_SCREENING]
                                     + catalog.routine_for(p["age_band"], p["gender"] or "f")))
    return {"patient": p["id"], "district": p["district"], "district_ar": catalog.DISTRICTS[p["district"]][0],
            "district_en": catalog.DISTRICTS[p["district"]][1], "language": p["language"], "gender": p["gender"],
            "age_band": p["age_band"], "family_history": codes, "sehhaty": catalog.sehhaty_profile(p),
            "recommended": [{"key": k, "ar": catalog.SCREENINGS[k]["ar"], "en": catalog.SCREENINGS[k]["en"],
                             "every_months": catalog.SCREENINGS[k]["every_months"]} for k in recommended],
            "plan": plan_for_case(db, case["id"]) if case else None}


@router.get("/catalog")
def public_catalog():
    """Reference lists for the app: family-history choices, warning symptoms, hereditary conditions."""
    return {"family_history": [{"key": k, "ar": v[0], "en": v[1]} for k, v in catalog.FAMILY_HISTORY.items()],
            "symptoms": [{"key": s[0], "ar": s[1], "en": s[2], "screening": s[3], "urgency": s[4]}
                         for s in catalog.FOLLOW_UP_SYMPTOMS],
            "hereditary": [{"key": k, "ar": v[0], "en": v[1]} for k, v in catalog.HEREDITARY.items()],
            "districts": [{"key": k, "ar": v[0], "en": v[1]} for k, v in catalog.DISTRICTS.items()]}


@router.patch("/language")
def set_language(body: LangIn, request: Request, p=Depends(current_patient)):
    with request.app.state.db.tx() as c:
        c.execute("UPDATE residents SET language = ? WHERE id = ?", (body.language, p["id"]))
    return {"language": body.language}


@router.put("/family-history")
def set_family(body: FamilyIn, request: Request, p=Depends(current_patient)):
    bad = [c for c in body.codes if c not in catalog.FAMILY_HISTORY]
    if bad:
        raise HTTPException(422, "unknown_code")
    with request.app.state.db.tx() as c:
        c.execute("INSERT INTO family_history VALUES (?, ?) ON CONFLICT(resident_id) DO UPDATE SET codes = excluded.codes",
                  (p["id"], ",".join(dict.fromkeys(body.codes))))
    return {"codes": body.codes}


@router.get("/plan")
def plan(request: Request, p=Depends(current_patient)):
    db = request.app.state.db
    case = open_case(db, p["id"])
    return plan_for_case(db, case["id"])


@router.get("/slots")
def slots(request: Request, days: int = 14, female: bool = False, district: str | None = None,
          private: bool = True, p=Depends(current_patient)):
    """Open times the person can book now: their screening's own times first, then any center time."""
    db = request.app.state.db
    case = open_case(db, p["id"])
    dist = district if district in catalog.DISTRICTS else p["district"]
    st = request.app.state.settings
    now = datetime.fromisoformat(st.demo_now) if (st.demo_mode and st.demo_now) else _now().astimezone(RIYADH)
    until = now + timedelta(days=max(1, min(days, 21)))
    rows = db.all("""SELECT * FROM slots WHERE (district = ? OR (? AND facility_id LIKE 'C-%'))
                     AND screening IN (?, 'general') AND remaining > 0
                     AND start_local > ? AND start_local < ? ORDER BY start_local""",
                  dist, int(private), case["screening"], now.isoformat(), until.isoformat())
    rows = [r for r in rows if not female or r["female_staff"]]
    # Free Ministry times come first; paid private times are a short extra list so they never crowd them out.
    free = [r for r in rows if not r["facility_id"].startswith("C-")][:120]
    paid = [r for r in rows if r["facility_id"].startswith("C-")][:40]
    out = [slot_detail(r, p, case["screening"]) for r in sorted(free + paid, key=lambda r: r["start_local"])]
    return {"district": dist, "slots": out}


@router.post("/book")
def book(body: BookIn, request: Request, p=Depends(current_patient)):
    """Book or move the appointment. The old place goes back to the pool in the same transaction."""
    db = request.app.state.db
    case = open_case(db, p["id"])
    with db.tx() as c:
        slot = c.execute("SELECT * FROM slots WHERE id = ?", (body.slot_id,)).fetchone()
        if slot is None or slot["district"] not in catalog.DISTRICTS or slot["screening"] not in (case["screening"], "general"):
            raise HTTPException(404, "slot_not_found")
        if c.execute("UPDATE slots SET remaining = remaining - 1 WHERE id = ? AND remaining > 0", (slot["id"],)).rowcount != 1:
            raise HTTPException(409, "slot_taken")
        old = c.execute("SELECT * FROM bookings WHERE case_id = ? AND status = 'confirmed'", (case["id"],)).fetchone()
        if old is not None:
            c.execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", (old["id"],))
            c.execute("UPDATE slots SET remaining = remaining + 1 WHERE id = ?", (old["slot_id"],))
        for h in c.execute("SELECT * FROM holds WHERE case_id = ? AND status = 'held'", (case["id"],)).fetchall():
            c.execute("UPDATE holds SET status = 'released' WHERE id = ?", (h["id"],))
            c.execute("UPDATE slots SET remaining = remaining + 1 WHERE id = ?", (h["slot_id"],))
        bid = new_id("bk")
        c.execute("INSERT INTO bookings (id,case_id,slot_id,offer_id,status,confirmed_at,sehhaty_ref) VALUES (?,?,?,?,?,?,?)",
                  (bid, case["id"], slot["id"], "app_" + bid, "confirmed", _now().isoformat(), catalog.new_sehhaty_ref()))
        c.execute("UPDATE cases SET status = 'booked' WHERE id = ?", (case["id"],))
        c.execute("INSERT INTO events VALUES (?,?,?,?,?,?,?)",
                  (new_id("ev"), case["id"], bid, "booking_confirmed" if old is None else "booking_moved", "app", None, _now().isoformat()))
    return plan_for_case(db, case["id"])


@router.post("/cancel")
def cancel(request: Request, p=Depends(current_patient)):
    db = request.app.state.db
    case = open_case(db, p["id"])
    with db.tx() as c:
        old = c.execute("SELECT * FROM bookings WHERE case_id = ? AND status = 'confirmed'", (case["id"],)).fetchone()
        if old is None:
            raise HTTPException(404, "no_booking")
        c.execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", (old["id"],))
        c.execute("UPDATE slots SET remaining = remaining + 1 WHERE id = ?", (old["slot_id"],))
        c.execute("UPDATE cases SET status = 'open' WHERE id = ?", (case["id"],))
    return plan_for_case(db, case["id"])


@router.get("/records")
def records(request: Request, p=Depends(current_patient)):
    return full_record(request.app.state.db, request.app.state.vault, p["id"])


@router.get("/files/{file_id}/link")
def file_link(file_id: str, request: Request, p=Depends(current_patient)):
    """A short-lived link the phone can open; the link code is kept only in memory, hashed."""
    db = request.app.state.db
    if db.one("SELECT 1 FROM files WHERE id = ? AND resident_id = ?", file_id, p["id"]) is None:
        raise HTTPException(404)
    code = secrets_token()
    links = getattr(request.app.state, "file_links", {})
    now = time.time()
    links = {k: v for k, v in links.items() if v[1] > now}
    links[hash_token(code)] = (file_id, now + FILE_LINK_SECONDS)
    request.app.state.file_links = links
    return {"path": f"/f/{code}", "expires_in": FILE_LINK_SECONDS}


def serve_file(db, vault, file_id: str) -> Response:
    f = db.one("SELECT * FROM files WHERE id = ?", file_id)
    if f is None:
        raise HTTPException(404)
    data = base64.b64decode(vault.decrypt(f["data_enc"]))
    return Response(content=data, media_type=f["mime"], headers={
        "Content-Disposition": f'inline; filename="{f["id"]}{_ext(f["mime"])}"', "Cache-Control": "no-store"})


def _ext(mime: str) -> str:
    return {"application/pdf": ".pdf", "image/png": ".png", "image/jpeg": ".jpg"}.get(mime, "")


@router.get("/meds")
def meds(request: Request, p=Depends(current_patient)):
    return {"meds": meds_view(request.app.state.db, request.app.state.vault, p["id"])}


@router.get("/messages")
def messages(request: Request, p=Depends(current_patient)):
    db, vault = request.app.state.db, request.app.state.vault
    doctors = sorted(my_doctors(db, p["id"]))
    out = []
    for m in db.all("SELECT * FROM messages WHERE resident_id = ? ORDER BY created_at", p["id"]):
        out.append(localize({"id": m["id"], "sender": m["sender"], "doctor_id": m["doctor_id"],
                             "body": vault.decrypt(m["body_enc"]), "created_at": m["created_at"]}, p["language"]))
    return {"doctors": [{k: catalog.doctor(d)[k] for k in ("id", "name_ar", "name_en", "specialty_ar", "specialty_en")}
                        for d in doctors], "messages": out}


@router.post("/messages")
def send_message(body: MessageIn, request: Request, p=Depends(current_patient)):
    db, vault = request.app.state.db, request.app.state.vault
    doctors = my_doctors(db, p["id"])
    did = body.doctor_id or (sorted(doctors)[0] if doctors else None)
    if did is None or did not in doctors:
        raise HTTPException(403, "no_doctor_yet")
    with db.tx() as c:
        c.execute("INSERT INTO messages VALUES (?,?,?,?,?,?)",
                  (new_id("msg"), p["id"], did, "patient", vault.encrypt(body.body.strip()), _now().isoformat()))
    return {"ok": True}


@router.get("/access-log")
def access_log(request: Request, p=Depends(current_patient)):
    rows = request.app.state.db.all("SELECT * FROM access_log WHERE resident_id = ? ORDER BY created_at DESC LIMIT 50", p["id"])
    return {"entries": [{"doctor_ar": catalog.doctor(r["doctor_id"])["name_ar"], "doctor_en": catalog.doctor(r["doctor_id"])["name_en"],
                         "action": r["action"], "at": r["created_at"]} for r in rows]}


@files_router.get("/f/{code}")
def open_file(code: str, request: Request):
    links = getattr(request.app.state, "file_links", {})
    hit = links.pop(hash_token(code), None)  # one use only
    if hit is None or hit[1] < time.time():
        raise HTTPException(404)
    return serve_file(request.app.state.db, request.app.state.vault, hit[0])
