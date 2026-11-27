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
    contact_permission INTEGER NOT NULL  -- 1 allowed, 0 declined / opted out
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
    kind TEXT NOT NULL DEFAULT 'center',      -- center | mobile_clinic
    female_staff INTEGER NOT NULL DEFAULT 0,
    companion_ok INTEGER NOT NULL DEFAULT 0,  -- two places together for a companion
    lat REAL NOT NULL DEFAULT 0,
    lon REAL NOT NULL DEFAULT 0
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
    token_hash TEXT NOT NULL UNIQUE,     -- SHA-256 of the call token; the token itself is never stored
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
    confirmed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS support_requests (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id),
    kind TEXT NOT NULL,
    status TEXT NOT NULL                 -- requested | confirmed | unavailable
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

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    booking_id TEXT,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    detail TEXT,                         -- fixed codes only, never free text from a caller
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
# Centers and a mobile clinic per district, with fictional coordinates in Riyadh.
_C = {
    "Qurtubah":   ("مركز قرطبة الصحي أ", 24.8160, 46.7350, "عيادة متنقلة عند جامع قرطبة", 24.8105, 46.7290),
    "Al-Naseem":  ("مركز النسيم الصحي", 24.7360, 46.8330, "عيادة متنقلة عند حديقة النسيم", 24.7300, 46.8270),
    "Al-Yarmouk": ("مركز اليرموك الصحي", 24.8030, 46.7810, "عيادة متنقلة عند جامع اليرموك", 24.7985, 46.7760),
}
_SCREEN = {"Qurtubah": "diabetes", "Al-Naseem": "diabetes", "Al-Yarmouk": "hypertension"}
# (suffix, day, time, kind, places, step_free, transport, female_staff, companion_ok)
_PATTERN = [
    ("1", "2026-11-29", "10:00", "center", 2, 1, 1, 0, 0),   # Sunday morning
    ("2", "2026-11-29", "19:00", "center", 1, 0, 0, 0, 0),   # Sunday evening, last place
    ("3", "2026-11-30", "16:30", "center", 3, 1, 1, 1, 1),   # Monday after Asr, female staff, companion
    ("4", "2026-12-01", "20:00", "center", 2, 0, 0, 0, 1),   # Tuesday evening
    ("5", "2026-12-04", "17:00", "mobile_clinic", 4, 1, 0, 1, 1),  # Friday after Asr, near home
    ("6", "2026-12-05", "09:30", "center", 2, 1, 1, 1, 0),   # Saturday morning
]
DEMO_SLOTS = []
for _i, (_d, (_cn, _la, _lo, _mn, _mla, _mlo)) in enumerate(_C.items()):
    for _suf, _day, _t, _kind, _n, _sf, _tr, _fs, _co in _PATTERN:
        _mob = _kind == "mobile_clinic"
        DEMO_SLOTS.append((f"S{_i + 1}{_suf}", _mn if _mob else _cn, _d, _SCREEN[_d],
                           f"{_day}T{_t}:00+03:00", _n, _sf, _tr, _kind, _fs, _co,
                           _mla if _mob else _la, _mlo if _mob else _lo))


def seed_demo(db: Database, vault) -> None:
    if db.one("SELECT COUNT(*) AS n FROM residents")["n"]:
        return
    with db.tx() as c:
        for rid, dist, age, lang, phone, ok in DEMO_RESIDENTS:
            c.execute("INSERT INTO residents VALUES (?,?,?,?,?,?)",
                      (rid, dist, age, lang, vault.encrypt(phone), ok))
        for row in DEMO_CASES:
            c.execute("INSERT INTO cases (id,resident_id,screening,due,due_date,cohort_entry) VALUES (?,?,?,?,?,?)", row)
        for row in DEMO_SLOTS:
            c.execute("INSERT INTO slots VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", row)
