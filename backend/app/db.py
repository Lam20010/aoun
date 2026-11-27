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
    transport INTEGER NOT NULL
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
    tool_calls INTEGER NOT NULL DEFAULT 0
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
DEMO_SLOTS = [
    # id,   center,                      district,     screening,      start_local,                 remaining, step_free, transport
    ("S01", "مركز قرطبة الصحي أ", "Qurtubah", "diabetes", "2026-11-29T10:00:00+03:00", 2, 0, 0),
    ("S02", "مركز قرطبة الصحي أ", "Qurtubah", "diabetes", "2026-11-29T19:00:00+03:00", 1, 0, 0),
    ("S03", "مركز النسيم الصحي", "Al-Naseem", "diabetes", "2026-11-30T16:30:00+03:00", 3, 1, 1),
    ("S04", "مركز اليرموك الصحي", "Al-Yarmouk", "hypertension", "2026-11-30T09:30:00+03:00", 2, 1, 0),
    ("S05", "مركز اليرموك الصحي", "Al-Yarmouk", "hypertension", "2026-12-01T17:00:00+03:00", 2, 0, 1),
    ("S06", "مركز قرطبة الصحي أ", "Qurtubah", "diabetes", "2026-12-01T20:00:00+03:00", 2, 0, 0),
]


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
            c.execute("INSERT INTO slots VALUES (?,?,?,?,?,?,?,?)", row)
