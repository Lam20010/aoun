"""SQLite storage. One file shared by the API (and later the worker).

Only what the service needs is stored: no names, no national IDs, phone numbers encrypted,
refusal reasons as fixed codes, and no call transcripts at all.
"""
import sqlite3
import threading
from contextlib import contextmanager

SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS residents (
    id TEXT PRIMARY KEY,
    district TEXT NOT NULL,
    age_band TEXT NOT NULL,
    language TEXT NOT NULL,              -- preferred language code, never nationality
    phone_enc TEXT NOT NULL,             -- Fernet-encrypted phone number
    contact_permission INTEGER NOT NULL, -- 1 allowed, 0 declined / opted out
    gender TEXT NOT NULL DEFAULT 'f',     -- picks the agent voice (Rufaida for women, Rafeed for men)
    -- from Sehhaty (simulated): identity type, the last 4 digits only, and insurance
    id_type TEXT NOT NULL DEFAULT 'citizen',
    id_last4 TEXT,
    insurer TEXT NOT NULL DEFAULT '',
    insurance_class TEXT NOT NULL DEFAULT '',
    insurance_until TEXT
);

CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    resident_id TEXT NOT NULL REFERENCES residents(id),
    screening TEXT NOT NULL,             -- internal code; never sent to the voice agent
    due INTEGER NOT NULL,
    due_date TEXT NOT NULL,
    cohort_entry TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open'  -- open | booked | completed | closed
);

CREATE TABLE IF NOT EXISTS slots (
    id TEXT PRIMARY KEY,
    center TEXT NOT NULL,
    district TEXT NOT NULL,
    screening TEXT NOT NULL,
    start_local TEXT NOT NULL,           -- ISO 8601 with +03:00
    remaining INTEGER NOT NULL CHECK (remaining >= 0),
    step_free INTEGER NOT NULL,
    transport INTEGER NOT NULL,
    kind TEXT NOT NULL DEFAULT 'center',      -- center | mobile_clinic | home_visit
    female_staff INTEGER NOT NULL DEFAULT 0,
    companion_ok INTEGER NOT NULL DEFAULT 0,  -- two places together for a companion
    lat REAL NOT NULL DEFAULT 0,
    lon REAL NOT NULL DEFAULT 0,
    facility_id TEXT,                    -- the health center that runs it (see catalog.FACILITIES)
    doctor_id TEXT                       -- the doctor who sees the person (see catalog.DOCTORS)
);

CREATE TABLE IF NOT EXISTS holds (
    id TEXT PRIMARY KEY,
    call_id TEXT NOT NULL UNIQUE REFERENCES call_sessions(id),
    case_id TEXT NOT NULL,
    slot_id TEXT NOT NULL REFERENCES slots(id),
    status TEXT NOT NULL,                -- held | confirmed | released
    expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS location_links (
    code_hash TEXT PRIMARY KEY,          -- SHA-256 of the one-time code in the SMS link
    call_id TEXT NOT NULL REFERENCES call_sessions(id),
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS call_sessions (
    id TEXT PRIMARY KEY,
    conv_hash TEXT UNIQUE,               -- SHA-256 of the ElevenLabs conversation id this call is bound to
    case_id TEXT NOT NULL REFERENCES cases(id),
    agent TEXT NOT NULL,
    language TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',  -- active | ended
    outcome TEXT,                        -- booked | refused | no_answer | later | opted_out | ended
    tool_calls INTEGER NOT NULL DEFAULT 0,
    distance_km REAL                     -- only this is kept from a shared location; coordinates are discarded
);

CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY,
    call_id TEXT NOT NULL REFERENCES call_sessions(id),
    slot_id TEXT NOT NULL REFERENCES slots(id),
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    slot_id TEXT NOT NULL REFERENCES slots(id),
    offer_id TEXT NOT NULL UNIQUE,       -- one offer can become at most one booking (idempotency)
    status TEXT NOT NULL,                -- confirmed | cancelled | missed | attended
    confirmed_at TEXT NOT NULL,
    sehhaty_ref TEXT                     -- the appointment number in Sehhaty (simulated)
);

CREATE TABLE IF NOT EXISTS support_requests (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id),
    kind TEXT NOT NULL,
    status TEXT NOT NULL                 -- requested | confirmed | unavailable
);

CREATE TABLE IF NOT EXISTS call_plans (
    call_id TEXT PRIMARY KEY REFERENCES call_sessions(id),  -- what the person chose during the call
    ride_mode TEXT,                      -- car | metro
    ride_party TEXT,                     -- alone | group | wheelchair
    pickup_minutes INTEGER,              -- 30 or 60 minutes before the appointment
    prefs TEXT NOT NULL DEFAULT '',      -- comma-separated fixed codes, never free text
    booking_id TEXT
);

CREATE TABLE IF NOT EXISTS barriers (
    call_id TEXT PRIMARY KEY REFERENCES call_sessions(id),  -- one reason per call
    case_id TEXT NOT NULL,
    district TEXT NOT NULL,
    reason TEXT NOT NULL,                -- fixed code from the allowed list
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    type TEXT NOT NULL,                  -- nurse_callback | outreach_call
    topic TEXT,
    run_at TEXT NOT NULL,
    state TEXT NOT NULL                  -- pending | done | cancelled
);

-- ---------- the person's health record (app + doctor portal) ----------

CREATE TABLE IF NOT EXISTS patient_tokens (
    token_hash TEXT PRIMARY KEY,         -- SHA-256 of the app's token; the token itself is never stored
    resident_id TEXT NOT NULL REFERENCES residents(id),
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    resident_id TEXT NOT NULL REFERENCES residents(id),
    facility_id TEXT NOT NULL,           -- where it came from: Aoun centers, hospitals, private clinics, labs
    doctor_id TEXT,                      -- set when an Aoun doctor wrote it
    kind TEXT NOT NULL,                  -- lab | report | visit | imaging
    screening TEXT,
    test_key TEXT,
    value TEXT,
    unit TEXT,
    flag TEXT,                           -- normal | borderline | high | low | positive | negative
    title_enc TEXT NOT NULL,             -- encrypted
    summary_enc TEXT,                    -- encrypted
    taken_at TEXT NOT NULL,
    source TEXT NOT NULL                 -- history (other facilities) | aoun
);

CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    resident_id TEXT NOT NULL REFERENCES residents(id),
    record_id TEXT,
    doctor_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    data_enc TEXT NOT NULL,              -- encrypted base64 of the file
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    resident_id TEXT NOT NULL REFERENCES residents(id),
    doctor_id TEXT NOT NULL,
    body_enc TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meds (
    id TEXT PRIMARY KEY,
    resident_id TEXT NOT NULL REFERENCES residents(id),
    doctor_id TEXT,
    facility_id TEXT NOT NULL,
    kind TEXT NOT NULL,                  -- medication | vitamin | supplement
    name TEXT NOT NULL,
    dose TEXT NOT NULL,
    times TEXT NOT NULL,                 -- comma-separated HH:MM
    days INTEGER NOT NULL,               -- 0 = ongoing
    start_date TEXT NOT NULL,
    with_food INTEGER NOT NULL DEFAULT 0,
    instructions_enc TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    resident_id TEXT NOT NULL REFERENCES residents(id),
    doctor_id TEXT NOT NULL,
    sender TEXT NOT NULL,                -- doctor | patient
    body_enc TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS family_history (
    resident_id TEXT PRIMARY KEY REFERENCES residents(id),
    codes TEXT NOT NULL DEFAULT ''       -- fixed codes only; no relative is ever named
);

CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    resident_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    kind TEXT NOT NULL,                  -- genetic_counselling | specialist
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS access_log (
    id TEXT PRIMARY KEY,
    resident_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    action TEXT NOT NULL,                -- viewed_record | added_result | added_note | ...
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS doctor_sessions (
    token_hash TEXT PRIMARY KEY,
    doctor_id TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    booking_id TEXT,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    detail TEXT,                         -- fixed codes only, never free text from a caller
    created_at TEXT NOT NULL
);
-- ---------- linking the app, the doctor portal and the Ministry board ----------

-- What happened, per district, with no person in it: feeds the Ministry board.
CREATE TABLE IF NOT EXISTS activity (
    id TEXT PRIMARY KEY,
    district TEXT NOT NULL,
    kind TEXT NOT NULL,                  -- booked | cancelled | barrier | result | early | referral | walk | helped | intervention
    detail TEXT,                         -- fixed codes only
    n INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

-- Ministry interventions: proposed for a district, approved by a person, then they change what people can book.
CREATE TABLE IF NOT EXISTS interventions (
    id TEXT PRIMARY KEY,
    district TEXT NOT NULL,
    kind TEXT NOT NULL,                  -- mobile_clinic | evening_hours | transport | language | challenge
    status TEXT NOT NULL,                -- proposed | approved
    created_at TEXT NOT NULL,
    approved_at TEXT,
    approved_by TEXT,
    slots INTEGER NOT NULL DEFAULT 0,
    until TEXT
);

CREATE TABLE IF NOT EXISTS ministry_sessions (
    token_hash TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

-- The person's own app state kept on the server so it follows them: the neighbourhood game and the assistant look.
CREATE TABLE IF NOT EXISTS app_state (
    resident_id TEXT PRIMARY KEY REFERENCES residents(id),
    game TEXT NOT NULL DEFAULT '{}',
    avatar TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT
);

-- Neighbourhood walks the person logs from the app (minutes only, no route or location).
CREATE TABLE IF NOT EXISTS walks (
    id TEXT PRIMARY KEY,
    resident_id TEXT NOT NULL REFERENCES residents(id),
    minutes INTEGER NOT NULL,
    day TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""


class Database:
    def __init__(self, path: str):
        self.path = path
        self._lock = threading.RLock()
        self.conn = sqlite3.connect(path, check_same_thread=False, isolation_level=None, timeout=10)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)

    @contextmanager
    def tx(self):
        """A write transaction that takes the database write lock up front (BEGIN IMMEDIATE),
        so two calls racing for the last place cannot both succeed."""
        with self._lock:
            self.conn.execute("BEGIN IMMEDIATE")
            try:
                yield self.conn
                self.conn.execute("COMMIT")
            except Exception:
                self.conn.execute("ROLLBACK")
                raise

    def one(self, sql: str, *args):
        with self._lock:
            return self.conn.execute(sql, args).fetchone()

    def all(self, sql: str, *args):
        with self._lock:
            return self.conn.execute(sql, args).fetchall()


# Fictional demo data, matching the starter workbook's shape (R01-R05, S01-S06).
# Replace with the real workbook import when it is ready.
DEMO_RESIDENTS = [
    # id,   district,  age_band, language, phone,            contact
    ("R01", "Qurtubah", "45-54", "ar", "+966500000101", 1),
    ("R02", "Al-Naseem", "65+",  "ar", "+966500000102", 1),
    ("R03", "Al-Yarmouk", "35-44", "ur", "+966500000103", 1),
    ("R04", "Qurtubah", "55-64", "ar", "+966500000104", 0),   # declined contact
    ("R05", "Al-Naseem", "35-44", "en", "+966500000105", 1),  # screening not due
]
DEMO_CASES = [
    # id,   resident, screening,  due, due_date,     cohort_entry
    ("C01", "R01", "diabetes", 1, "2026-10-20", "2026-10-20"),
    ("C02", "R02", "diabetes", 1, "2026-09-15", "2026-09-15"),
    ("C03", "R03", "hypertension", 1, "2026-11-01", "2026-11-01"),
    ("C04", "R04", "diabetes", 1, "2026-10-01", "2026-10-01"),
    ("C05", "R05", "diabetes", 0, "2027-03-01", "2027-03-01"),
]
# Centers, a mobile clinic and home visits per district, with fictional coordinates in Riyadh.
# The times follow the prototype call: held Thursday 4:30 Asr at the center; Thursday 5:00 at the
# mobile clinic by the mosque; Thursday 4:30 home visit; Sunday 8:30 morning; Wednesday 7:00 evening;
# Saturday 10:00 weekend.
_C = {
    "Qurtubah":   ("مركز صحي قرطبة", 24.8160, 46.7350, "العيادة المتنقلة عند جامع قرطبة", 24.8105, 46.7290),
    "Al-Naseem":  ("مركز صحي النسيم", 24.7360, 46.8330, "العيادة المتنقلة عند جامع النسيم", 24.7300, 46.8270),
    "Al-Yarmouk": ("مركز صحي اليرموك", 24.8030, 46.7810, "العيادة المتنقلة عند جامع اليرموك", 24.7985, 46.7760),
}
from .catalog import DISTRICTS, doctor as _doc, doctors_at, phc_for

DISTRICT_AR = {k: v[0] for k, v in DISTRICTS.items()}
HOME_VISIT = "في بيتك، الفريق الصحي يجيك"
_SCREEN = {"Qurtubah": "diabetes", "Al-Naseem": "diabetes", "Al-Yarmouk": "hypertension"}
# (suffix, day, time, kind, places, step_free, transport, female_staff, companion_ok)
_PATTERN = [
    ("1", "2026-12-03", "16:30", "center", 3, 1, 1, 1, 1),         # Thursday 4:30 Asr: the held appointment
    ("2", "2026-12-09", "19:00", "center", 1, 1, 1, 1, 1),         # Wednesday 7:00 evening, last place
    ("3", "2026-12-06", "08:30", "center", 2, 1, 1, 1, 1),         # Sunday 8:30 early morning
    ("4", "2026-12-05", "10:00", "center", 2, 1, 1, 1, 1),         # Saturday 10:00 weekend
    ("5", "2026-12-03", "17:00", "mobile_clinic", 4, 1, 0, 1, 1),  # Thursday 5:00 by the mosque, near home
    ("6", "2026-12-03", "16:30", "home_visit", 2, 1, 0, 1, 1),     # Thursday 4:30 the team comes home
]
DEMO_SLOTS = []
for _i, (_d, (_cn, _la, _lo, _mn, _mla, _mlo)) in enumerate(_C.items()):
    _fac = phc_for(_d)
    _docs = doctors_at(_fac)
    _female = [x for x in _docs if _doc(x)["gender"] == "f"] or _docs
    for _suf, _day, _t, _kind, _n, _sf, _tr, _fs, _co in _PATTERN:
        _name = {"center": _cn, "mobile_clinic": _mn, "home_visit": HOME_VISIT}[_kind]
        _mob = _kind == "mobile_clinic"
        DEMO_SLOTS.append((f"S{_i + 1}{_suf}", _name, _d, _SCREEN[_d],
                           f"{_day}T{_t}:00+03:00", _n, _sf, _tr, _kind, _fs, _co,
                           _mla if _mob else _la, _mlo if _mob else _lo, _fac, _female[0]))


def generated_slots(start_day: str, days: int = 21) -> list[tuple]:
    """Open times at every health center for the next three weeks (not Fridays), one doctor per time.
    'general' slots suit any screening; the prototype's own slots above are offered first."""
    from datetime import date, timedelta as _td
    from .catalog import facility as _fac_info
    times = ["08:00", "09:00", "10:30", "16:00", "17:30", "19:30"]
    out = []
    d0 = date.fromisoformat(start_day)
    for di in range(days):
        day = d0 + _td(days=di)
        for dist in (DISTRICTS if day.weekday() != 4 else ()):  # health centers close on Friday
            fid = phc_for(dist)
            f = _fac_info(fid)
            docs = doctors_at(fid)
            for ti, t in enumerate(times):
                doc = docs[(ti + di) % len(docs)]
                info = _doc(doc)
                places = 1 + (di * 7 + ti * 3 + len(dist)) % 3
                out.append((f"G{fid[2:]}{day.strftime('%m%d')}{t.replace(':', '')}", f["name_ar"], dist, "general",
                            f"{day.isoformat()}T{t}:00+03:00", places, int(f["wheelchair"]), 1, "center",
                            int(info["gender"] == "f"), 1, f["lat"], f["lon"], fid, doc))
        # Ministry hospitals' screening clinics: Sunday to Thursday, free
        if day.weekday() not in (4, 5):
            for fid in ("H-EAST", "H-NORTH", "H-CENTRAL"):
                f = _fac_info(fid)
                docs = doctors_at(fid)
                for ti, t in enumerate(["08:30", "11:00", "13:30"]):
                    doc = docs[(ti + di) % len(docs)]
                    info = _doc(doc)
                    out.append((f"H{fid[2:6]}{day.strftime('%m%d')}{t.replace(':', '')}", f["name_ar"], f["district"], "general",
                                f"{day.isoformat()}T{t}:00+03:00", 3, int(f["wheelchair"]), 1, "center",
                                int(info["gender"] == "f"), 1, f["lat"], f["lon"], fid, doc))
        # private clinics and hospital: earlier, later and on Fridays, but paid
        for fid in ("C-NAKHEEL", "C-SHIFA", "H-RAAYA"):
            f = _fac_info(fid)
            docs = doctors_at(fid)
            for ti, t in enumerate(["07:00", "13:00", "21:00", "22:30"]):
                doc = docs[(ti + di) % len(docs)]
                info = _doc(doc)
                out.append((f"P{fid[2:5]}{day.strftime('%m%d')}{t.replace(':', '')}", f["name_ar"], f["district"], "general",
                            f"{day.isoformat()}T{t}:00+03:00", 2, int(f["wheelchair"]), 1, "center",
                            int(info["gender"] == "f"), 1, f["lat"], f["lon"], fid, doc))
    return out


def seed_demo(db: Database, vault, start_day: str = "2026-11-27") -> None:
    if db.one("SELECT COUNT(*) AS n FROM residents")["n"]:
        return
    with db.tx() as c:
        for rid, dist, age, lang, phone, ok in DEMO_RESIDENTS:
            c.execute("INSERT INTO residents (id,district,age_band,language,phone_enc,contact_permission) VALUES (?,?,?,?,?,?)",
                      (rid, dist, age, lang, vault.encrypt(phone), ok))
        for row in DEMO_CASES:
            c.execute("INSERT INTO cases (id,resident_id,screening,due,due_date,cohort_entry) VALUES (?,?,?,?,?,?)", row)
        for row in DEMO_SLOTS + generated_slots(start_day):
            c.execute("INSERT INTO slots VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", row)
        from .history import seed_history
        for rid, *_ in DEMO_RESIDENTS:
            seed_history(c, vault, rid)
