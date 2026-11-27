"""Doctor portal API and page (/doctor).

A doctor sees only the people booked with them. For those people they see the whole health record
from every facility, add results, notes and files, prescribe medicines or vitamins with times (the
person's app sets reminders), message the person, and refer to genetic counselling. Every opening of
a record is written to the access log, which the person can read in their app.

Genetic results are never stored: genetic screenings can only be referred.
"""
import base64
import hmac
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, ConfigDict, Field

from . import catalog
from .patient import full_record, meds_view, serve_file
from .security import hash_token, new_id, secrets_token

router = APIRouter()
STATIC = Path(__file__).parent / "static"
SESSION_HOURS = 12
MAX_FILE_BYTES = 5 * 1024 * 1024
ALLOWED_MIME = {"application/pdf", "image/png", "image/jpeg"}
DEMO_DOCTOR_CODE = "aoun-demo-2026"


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LoginIn(Strict):
    doctor_id: str = Field(min_length=1, max_length=10)
    password: str | None = Field(default=None, min_length=4, max_length=200)
    code: str | None = Field(default=None, min_length=4, max_length=200)  # older clients


class Value(Strict):
    test_key: str = Field(pattern=r"^[a-z0-9_]{2,20}$")
    value: str = Field(min_length=1, max_length=20)


class ResultsIn(Strict):
    screening: str = Field(pattern=r"^[a-z_]{3,40}$")
    values: list[Value] = Field(min_length=1, max_length=6)
    summary: str = Field(default="", max_length=600)


class NoteIn(Strict):
    body: str = Field(min_length=1, max_length=2000)


class FileIn(Strict):
    filename: str = Field(min_length=1, max_length=120)
    mime: str
    data_b64: str = Field(min_length=4, max_length=7_000_000)
    record_id: str | None = Field(default=None, pattern=r"^rec_[0-9a-f]{12}$")


class MedIn(Strict):
    kind: str = Field(pattern=r"^(medication|vitamin|supplement)$")
    name_ar: str = Field(min_length=1, max_length=80)
    name_en: str = Field(default="", max_length=80)
    dose: str = Field(min_length=1, max_length=40)
    times: list[str] = Field(min_length=1, max_length=6)
    days: int = Field(ge=0, le=365)          # 0 = ongoing
    with_food: bool = False
    instructions: str = Field(default="", max_length=300)


class MessageIn(Strict):
    body: str = Field(min_length=1, max_length=1000)


class ReferralIn(Strict):
    kind: str = Field(pattern=r"^(genetic_counselling|specialist)$")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _password_ok(request: Request, doctor_id: str, password: str) -> bool:
    """Each doctor's own password (PBKDF2 hashes in AOUN_DOCTOR_PASSWORDS), else the shared code."""
    import hashlib
    import json
    import os
    try:
        hashes = json.loads(os.environ.get("AOUN_DOCTOR_PASSWORDS", "") or "{}")
    except ValueError:
        hashes = {}
    stored = hashes.get(doctor_id)
    if stored:
        try:
            _, iters, salt, digest = stored.split("$")
            got = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iters)).hex()
        except ValueError:
            return False
        return hmac.compare_digest(got, digest)
    code = _code(request)
    return bool(code) and hmac.compare_digest(password.encode(), code.encode())


def hash_password(password: str, iters: int = 200_000) -> str:
    """Make a value for AOUN_DOCTOR_PASSWORDS: python -c 'from app.doctor import hash_password; print(hash_password("..."))'"""
    import hashlib
    import secrets
    salt = secrets.token_bytes(16)
    return f"pbkdf2_sha256${iters}${salt.hex()}${hashlib.pbkdf2_hmac('sha256', password.encode(), salt, iters).hex()}"


_FAILS: dict[str, list[float]] = {}


def _code(request: Request) -> str:
    import os
    code = os.environ.get("AOUN_DOCTOR_CODE", "")
    if not code and request.app.state.settings.demo_mode:
        code = DEMO_DOCTOR_CODE
    return code


def current_doctor(request: Request, authorization: str = Header(default="")) -> dict:
    token = authorization.removeprefix("Bearer ").strip()
    row = request.app.state.db.one("SELECT * FROM doctor_sessions WHERE token_hash = ?", hash_token(token)) if token else None
    if row is None or datetime.fromisoformat(row["expires_at"]) < _now():
        raise HTTPException(401, "unauthorized")
    return catalog.doctor(row["doctor_id"])


def _my_patient(request: Request, doc: dict, rid: str):
    """The doctor may open a record only while the person is (or was) booked with them."""
    db = request.app.state.db
    ok = db.one("""SELECT 1 FROM bookings b JOIN slots sl ON sl.id = b.slot_id JOIN cases c ON c.id = b.case_id
                   WHERE c.resident_id = ? AND sl.doctor_id = ? AND b.status IN ('confirmed','attended')""", rid, doc["id"])
    if ok is None:
        raise HTTPException(403, "not_your_patient")
    return db.one("SELECT * FROM residents WHERE id = ?", rid)


def _log(c, rid: str, did: str, action: str):
    c.execute("INSERT INTO access_log VALUES (?,?,?,?,?)", (new_id("acc"), rid, did, action, _now().isoformat()))


def _alias(r) -> str:
    return ("مراجِعة" if r["gender"] == "f" else "مراجِع") + " #" + r["id"][-4:]


def _flag(screening: str, key: str, value: str) -> str:
    for t in catalog.SCREENINGS[screening]["tests"]:
        if t[0] != key:
            continue
        low, high, border = t[4], t[5], t[6]
        try:
            v = float(value.replace(",", "."))
        except ValueError:
            return {"positive": "positive", "negative": "negative"}.get(value.lower(), "")
        if key == "tscore":
            return "high" if v <= border else ("borderline" if v < low else "normal")
        if low is not None and v < low:
            return "low"
        if high is not None and v <= high:
            return "normal"
        if border is not None and v <= border:
            return "borderline"
        return "high"
    raise HTTPException(422, "unknown_test")


# ---------- page ----------

@router.get("/doctor", response_class=HTMLResponse)
def portal():
    return HTMLResponse((STATIC / "doctor.html").read_text(encoding="utf-8"), headers={
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' "
                                   "https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; "
                                   "frame-src 'self' blob:; object-src 'self' blob:; connect-src 'self'"})


# ---------- api ----------

@router.get("/doctor/api/config")
def config(request: Request):
    demo = request.app.state.settings.demo_mode
    return {"demo": demo, "demo_code": DEMO_DOCTOR_CODE if demo and not __import__("os").environ.get("AOUN_DOCTOR_CODE") else None,
            "doctors": [{k: catalog.doctor(d[0])[k] for k in ("id", "name_ar", "name_en", "specialty_ar", "specialty_en", "clinic_ar", "clinic_en")}
                        | {"facility_ar": catalog.facility(d[1])["name_ar"], "facility_en": catalog.facility(d[1])["name_en"]}
                        for d in catalog.DOCTORS]}


@router.post("/doctor/api/login")
def login(body: LoginIn, request: Request):
    import time
    did = body.doctor_id.strip().upper()
    now = time.time()
    fails = [t for t in _FAILS.get(did, []) if now - t < 900]
    if len(fails) >= 5:  # five wrong tries lock the account for 15 minutes
        raise HTTPException(429, "too_many_attempts")
    known = any(d[0] == did for d in catalog.DOCTORS)
    password = body.password or body.code or ""
    if not known or not _password_ok(request, did, password):
        _FAILS[did] = fails + [now]
        raise HTTPException(401, "wrong_id_or_password")  # same answer for an unknown ID
    _FAILS.pop(did, None)
    body = body.model_copy(update={"doctor_id": did})
    token = secrets_token() + secrets_token()
    with request.app.state.db.tx() as c:
        c.execute("DELETE FROM doctor_sessions WHERE expires_at < ?", (_now().isoformat(),))
        c.execute("INSERT INTO doctor_sessions VALUES (?,?,?)",
                  (hash_token(token), body.doctor_id, (_now() + timedelta(hours=SESSION_HOURS)).isoformat()))
    return {"token": token}


@router.get("/doctor/api/catalog")
def doctor_catalog(doc=Depends(current_doctor)):
    return {"screenings": [{"key": k, "ar": v["ar"], "en": v["en"],
                            "tests": [{"key": t[0], "ar": t[1], "en": t[2], "unit": t[3], "low": t[4], "high": t[5]} for t in v["tests"]]}
                           for k, v in catalog.SCREENINGS.items()],
            "hereditary": [{"key": k, "ar": v[0], "en": v[1]} for k, v in catalog.HEREDITARY.items()],
            "medicines": [{"key": m[0], "kind": m[1], "ar": m[2], "en": m[3], "dose": m[4], "times": m[5].split(",")}
                          for m in catalog.MEDICINES]}


@router.get("/doctor/api/me")
def me(request: Request, doc=Depends(current_doctor)):
    db = request.app.state.db
    rows = db.all("""SELECT b.status AS bstatus, sl.start_local, sl.kind, c.screening, r.*
                     FROM bookings b JOIN slots sl ON sl.id = b.slot_id JOIN cases c ON c.id = b.case_id
                     JOIN residents r ON r.id = c.resident_id
                     WHERE sl.doctor_id = ? AND b.status IN ('confirmed','attended') ORDER BY sl.start_local""", doc["id"])
    unread = {r["resident_id"]: r["n"] for r in db.all(
        """SELECT resident_id, COUNT(*) AS n FROM messages WHERE doctor_id = ? AND sender = 'patient' GROUP BY resident_id""", doc["id"])}
    return {"doctor": doc, "facility": catalog.facility(doc["facility"]),
            "appointments": [{"patient": r["id"], "alias": _alias(r), "start": r["start_local"], "kind": r["kind"],
                              "status": r["bstatus"], "screening": r["screening"],
                              "screening_ar": catalog.SCREENINGS.get(r["screening"], {}).get("ar", r["screening"]),
                              "screening_en": catalog.SCREENINGS.get(r["screening"], {}).get("en", r["screening"]),
                              "age_band": r["age_band"], "language": r["language"], "messages": unread.get(r["id"], 0)}
                             for r in rows]}


@router.get("/doctor/api/notifications")
def notifications(request: Request, doc=Depends(current_doctor)):
    """What the doctor should know: new bookings, patient messages, and visits in the next 24 hours."""
    db, vault = request.app.state.db, request.app.state.vault
    now = _now()
    out = []
    for r in db.all("""SELECT b.confirmed_at, b.status, sl.start_local, c.screening, r.* FROM bookings b
                       JOIN slots sl ON sl.id = b.slot_id JOIN cases c ON c.id = b.case_id JOIN residents r ON r.id = c.resident_id
                       WHERE sl.doctor_id = ? AND b.status IN ('confirmed','attended')
                       ORDER BY b.confirmed_at DESC LIMIT 20""", doc["id"]):
        base = {"patient": r["id"], "alias": _alias(r), "start": r["start_local"],
                "screening_ar": catalog.SCREENINGS.get(r["screening"], {}).get("ar", r["screening"]),
                "screening_en": catalog.SCREENINGS.get(r["screening"], {}).get("en", r["screening"])}
        out.append({"kind": "booking", "at": r["confirmed_at"], **base})
        start = datetime.fromisoformat(r["start_local"])
        if r["status"] == "confirmed" and now <= start <= now + timedelta(hours=24):
            out.append({"kind": "soon", "at": now.isoformat(), **base})
    for m in db.all("""SELECT m.created_at, m.body_enc, r.* FROM messages m JOIN residents r ON r.id = m.resident_id
                       WHERE m.doctor_id = ? AND m.sender = 'patient' ORDER BY m.created_at DESC LIMIT 20""", doc["id"]):
        body = vault.decrypt(m["body_enc"])
        out.append({"kind": "message", "at": m["created_at"], "patient": m["id"], "alias": _alias(m),
                    "preview": body[:80] + ("…" if len(body) > 80 else "")})
    out.sort(key=lambda x: x["at"], reverse=True)
    return {"items": out[:30]}


@router.get("/doctor/api/patients/{rid}")
def patient(rid: str, request: Request, doc=Depends(current_doctor)):
    r = _my_patient(request, doc, rid)
    db, vault = request.app.state.db, request.app.state.vault
    with db.tx() as c:
        _log(c, rid, doc["id"], "viewed_record")
    fam = db.one("SELECT codes FROM family_history WHERE resident_id = ?", rid)
    prefs = db.one("""SELECT p.prefs FROM call_plans p JOIN call_sessions s ON s.id = p.call_id JOIN cases c ON c.id = s.case_id
                      WHERE c.resident_id = ? ORDER BY s.created_at DESC LIMIT 1""", rid)
    msgs = [{"id": m["id"], "sender": m["sender"], "body": vault.decrypt(m["body_enc"]), "created_at": m["created_at"]}
            for m in db.all("SELECT * FROM messages WHERE resident_id = ? AND doctor_id = ? ORDER BY created_at", rid, doc["id"])]
    return {"patient": {"id": r["id"], "alias": _alias(r), "age_band": r["age_band"], "gender": r["gender"],
                        "district_ar": catalog.DISTRICTS[r["district"]][0], "district_en": catalog.DISTRICTS[r["district"]][1],
                        "language": r["language"],
                        "family_history": [catalog.FAMILY_HISTORY[x][0] for x in ((fam["codes"] if fam else "") or "").split(",") if x],
                        "family_history_en": [catalog.FAMILY_HISTORY[x][1] for x in ((fam["codes"] if fam else "") or "").split(",") if x],
                        "prefs": [x for x in ((prefs["prefs"] if prefs else "") or "").split(",") if x]},
            **full_record(db, vault, rid), "meds": meds_view(db, vault, rid), "messages": msgs}


@router.post("/doctor/api/patients/{rid}/results")
def add_results(rid: str, body: ResultsIn, request: Request, doc=Depends(current_doctor)):
    _my_patient(request, doc, rid)
    if body.screening in catalog.HEREDITARY:
        raise HTTPException(422, "genetic_results_are_not_stored: send a genetic counselling referral instead")
    if body.screening not in catalog.SCREENINGS:
        raise HTTPException(422, "unknown_screening")
    tests = {t[0]: t for t in catalog.SCREENINGS[body.screening]["tests"]}
    db, vault = request.app.state.db, request.app.state.vault
    ids = []
    with db.tx() as c:
        for v in body.values:
            if v.test_key not in tests:
                raise HTTPException(422, "unknown_test")
            t = tests[v.test_key]
            rid_ = new_id("rec")
            ids.append(rid_)
            c.execute("""INSERT INTO records (id,resident_id,facility_id,doctor_id,kind,screening,test_key,value,unit,flag,
                         title_enc,summary_enc,taken_at,source) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                      (rid_, rid, doc["facility"], doc["id"], "lab", body.screening, v.test_key, v.value.strip(), t[3],
                       _flag(body.screening, v.test_key, v.value.strip()), vault.encrypt(f"{t[1]}|{t[2]}"),
                       vault.encrypt(f"{body.summary}|{body.summary}") if body.summary else None, _now().date().isoformat(), "aoun"))
        c.execute("""UPDATE bookings SET status = 'attended' WHERE status = 'confirmed' AND case_id IN
                     (SELECT id FROM cases WHERE resident_id = ?) AND slot_id IN (SELECT id FROM slots WHERE doctor_id = ?)""",
                  (rid, doc["id"]))
        c.execute("UPDATE cases SET status = 'completed' WHERE resident_id = ? AND screening = ? AND status = 'booked'",
                  (rid, body.screening))
        _log(c, rid, doc["id"], "added_result")
    return {"records": ids}


@router.post("/doctor/api/patients/{rid}/notes")
def add_note(rid: str, body: NoteIn, request: Request, doc=Depends(current_doctor)):
    _my_patient(request, doc, rid)
    db = request.app.state.db
    with db.tx() as c:
        c.execute("INSERT INTO notes VALUES (?,?,?,?,?)",
                  (new_id("note"), rid, doc["id"], request.app.state.vault.encrypt(body.body.strip()), _now().isoformat()))
        _log(c, rid, doc["id"], "added_note")
    return {"ok": True}


@router.post("/doctor/api/patients/{rid}/files")
def add_file(rid: str, body: FileIn, request: Request, doc=Depends(current_doctor)):
    _my_patient(request, doc, rid)
    if body.mime not in ALLOWED_MIME:
        raise HTTPException(415, "pdf_png_or_jpeg_only")
    try:
        raw = base64.b64decode(body.data_b64, validate=True)
    except ValueError:
        raise HTTPException(422, "bad_file")
    if len(raw) > MAX_FILE_BYTES:
        raise HTTPException(413, "file_too_large")
    magic = {"application/pdf": b"%PDF", "image/png": b"\x89PNG", "image/jpeg": b"\xff\xd8"}[body.mime]
    if not raw.startswith(magic):
        raise HTTPException(415, "file_type_mismatch")
    db = request.app.state.db
    if body.record_id and db.one("SELECT 1 FROM records WHERE id = ? AND resident_id = ?", body.record_id, rid) is None:
        raise HTTPException(404, "record_not_found")
    fid = new_id("file")
    name = "".join(ch for ch in body.filename if ch.isalnum() or ch in " ._-()")[:120] or "report"
    with db.tx() as c:
        c.execute("INSERT INTO files VALUES (?,?,?,?,?,?,?,?,?)",
                  (fid, rid, body.record_id, doc["id"], name, body.mime, len(raw),
                   request.app.state.vault.encrypt(base64.b64encode(raw).decode()), _now().isoformat()))
        _log(c, rid, doc["id"], "added_file")
    return {"id": fid}


@router.get("/doctor/api/files/{file_id}")
def get_file(file_id: str, request: Request, doc=Depends(current_doctor)):
    f = request.app.state.db.one("SELECT resident_id FROM files WHERE id = ?", file_id)
    if f is None:
        raise HTTPException(404)
    _my_patient(request, doc, f["resident_id"])
    return serve_file(request.app.state.db, request.app.state.vault, file_id)


@router.post("/doctor/api/patients/{rid}/meds")
def add_med(rid: str, body: MedIn, request: Request, doc=Depends(current_doctor)):
    _my_patient(request, doc, rid)
    times = []
    for t in body.times:
        try:
            times.append(datetime.strptime(t, "%H:%M").strftime("%H:%M"))
        except ValueError:
            raise HTTPException(422, "times_must_be_HH:MM")
    db, vault = request.app.state.db, request.app.state.vault
    mid = new_id("med")
    ins = body.instructions.strip()
    with db.tx() as c:
        c.execute("""INSERT INTO meds (id,resident_id,doctor_id,facility_id,kind,name,dose,times,days,start_date,with_food,
                     instructions_enc,active,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                  (mid, rid, doc["id"], doc["facility"], body.kind, f"{body.name_ar.strip()}|{(body.name_en or body.name_ar).strip()}",
                   body.dose.strip(), ",".join(sorted(set(times))), body.days, _now().date().isoformat(), int(body.with_food),
                   vault.encrypt(f"{ins}|{ins}") if ins else None, 1, _now().isoformat()))
        _log(c, rid, doc["id"], "added_medicine")
    return {"id": mid}


@router.post("/doctor/api/patients/{rid}/meds/{mid}/stop")
def stop_med(rid: str, mid: str, request: Request, doc=Depends(current_doctor)):
    _my_patient(request, doc, rid)
    with request.app.state.db.tx() as c:
        if c.execute("UPDATE meds SET active = 0 WHERE id = ? AND resident_id = ?", (mid, rid)).rowcount != 1:
            raise HTTPException(404)
        _log(c, rid, doc["id"], "stopped_medicine")
    return {"ok": True}


@router.post("/doctor/api/patients/{rid}/messages")
def message(rid: str, body: MessageIn, request: Request, doc=Depends(current_doctor)):
    _my_patient(request, doc, rid)
    with request.app.state.db.tx() as c:
        c.execute("INSERT INTO messages VALUES (?,?,?,?,?,?)",
                  (new_id("msg"), rid, doc["id"], "doctor", request.app.state.vault.encrypt(body.body.strip()), _now().isoformat()))
    return {"ok": True}


@router.post("/doctor/api/patients/{rid}/referral")
def referral(rid: str, body: ReferralIn, request: Request, doc=Depends(current_doctor)):
    _my_patient(request, doc, rid)
    with request.app.state.db.tx() as c:
        c.execute("INSERT INTO referrals VALUES (?,?,?,?,?)", (new_id("ref"), rid, doc["id"], body.kind, _now().isoformat()))
        _log(c, rid, doc["id"], "referral_" + body.kind)
    return {"ok": True}
