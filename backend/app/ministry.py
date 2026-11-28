"""Ministry view: aggregate counts only, and any group under 50 residents is hidden."""
from collections import defaultdict

import hmac
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel, ConfigDict, Field

from . import catalog, link
from .security import _same, hash_token, new_id, require_admin_key, secrets_token

router = APIRouter(prefix="/ministry")
STATIC = Path(__file__).parent / "static"
DEMO_MINISTRY_PASSWORD = "aoun-ministry-2026"
SESSION_HOURS = 12

MIN_GROUP = 50
REASONS = ["transport", "far", "work_hours", "fear", "no_need", "needs_companion", "embarrassment",
           "cost_concern", "language", "childcare", "other"]


@router.get("/kpis", dependencies=[Depends(require_admin_key)])
def kpis(request: Request):
    db = request.app.state.db
    eligible = defaultdict(int)
    for r in db.all("""SELECT r.district FROM cases c JOIN residents r ON r.id = c.resident_id
                       WHERE c.due = 1"""):
        eligible[r["district"]] += 1

    def count(sql):
        out = defaultdict(int)
        for r in db.all(sql):
            out[r["district"]] += 1
        return out

    contacted = count("""SELECT DISTINCT cs.case_id, r.district FROM call_sessions cs
                         JOIN cases c ON c.id = cs.case_id JOIN residents r ON r.id = c.resident_id""")
    booked = count("""SELECT DISTINCT b.case_id, r.district FROM bookings b
                      JOIN cases c ON c.id = b.case_id JOIN residents r ON r.id = c.resident_id""")
    barriers = defaultdict(lambda: defaultdict(int))
    for r in db.all("SELECT district, reason FROM barriers"):
        barriers[r["district"]][r["reason"]] += 1

    districts = []
    for d in sorted(eligible):
        if eligible[d] < MIN_GROUP:
            districts.append({"district": d, "suppressed": True})
            continue
        districts.append({
            "district": d, "suppressed": False,
            "eligible": eligible[d], "contacted": contacted[d], "booked": booked[d],
            "barriers": {k: barriers[d][k] for k in REASONS},
        })
    return {"min_group_size": MIN_GROUP, "districts": districts}


# ---------- the live board (/ministry/board) ----------

class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LoginIn(Strict):
    staff_id: str = Field(min_length=2, max_length=12, pattern=r"^[A-Za-z0-9]+$")
    password: str = Field(min_length=4, max_length=200)


_FAILS: dict[str, list[float]] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _password(request: Request) -> str:
    pw = os.environ.get("AOUN_MINISTRY_PASSWORD", "")
    if not pw and request.app.state.settings.demo_mode:
        pw = DEMO_MINISTRY_PASSWORD
    return pw


def current_staff(request: Request, authorization: str = Header(default=""), x_admin_key: str = Header(default="")) -> str:
    """A signed-in Ministry staff member, or a server with the admin key."""
    if x_admin_key and _same(x_admin_key, request.app.state.settings.admin_key):
        return "admin"
    token = authorization.removeprefix("Bearer ").strip()
    row = request.app.state.db.one("SELECT * FROM ministry_sessions WHERE token_hash = ?", hash_token(token)) if token else None
    if row is None or datetime.fromisoformat(row["expires_at"]) < _now():
        raise HTTPException(401, "unauthorized")
    return row["staff_id"]


@router.get("/board", response_class=HTMLResponse)
def board():
    path = STATIC / "ministry.html"
    if not path.exists():
        raise HTTPException(404, "not_found")
    return HTMLResponse(path.read_text(encoding="utf-8"))


@router.get("/board/{name}")
def board_asset(name: str):
    allowed = {"dcrt.js": "application/javascript", "data.js": "application/javascript", "ksa-regions.json": "application/json",
               "mark.png": "image/png", "wordmark.png": "image/png", "ministry-logo.png": "image/png"}
    if name not in allowed:
        raise HTTPException(404, "not_found")
    return FileResponse(STATIC / "board" / name, media_type=allowed[name])


@router.post("/api/login")
def login(body: LoginIn, request: Request):
    import time
    now = time.time()
    key = body.staff_id.upper()
    fails = [t for t in _FAILS.get(key, []) if now - t < 900]
    if len(fails) >= 5:
        raise HTTPException(429, "too_many_attempts")
    pw = _password(request)
    if not pw or not hmac.compare_digest(body.password.encode(), pw.encode()):
        _FAILS[key] = fails + [now]
        raise HTTPException(401, "wrong_id_or_password")
    _FAILS.pop(key, None)
    token = secrets_token()
    with request.app.state.db.tx() as c:
        c.execute("INSERT INTO ministry_sessions VALUES (?,?,?)",
                  (hash_token(token), key, (_now() + timedelta(hours=SESSION_HOURS)).isoformat()))
    return {"token": token, "staff_id": key}


RANGE_DAYS = {"month": 30, "quarter": 91, "year": 365}


@router.get("/api/live")
def live(request: Request, range: str = "year", staff=Depends(current_staff)):
    """District counts from the pilot, a feed of what just happened, and the interventions.
    Everything here is a count per district: no person, name, number or condition is in it."""
    db = request.app.state.db
    since = (_now() - timedelta(days=RANGE_DAYS.get(range, 365))).isoformat()
    rows = db.all("""SELECT district, kind, detail, SUM(n) AS n FROM activity WHERE created_at > ?
                     GROUP BY district, kind, detail""", since)
    districts = {}
    for k, (ar, en, lat, lon) in catalog.DISTRICTS.items():
        districts[k] = {"key": k, "ar": ar, "en": en, "lat": lat, "lon": lon, "booked": 0, "cancelled": 0, "results": 0,
                        "early": 0, "referrals": 0, "walk_minutes": 0, "helped": 0, "contacted": 0, "barriers": {},
                        "interventions": link.active(db, k)}
    for r in rows:
        d = districts.get(r["district"])
        if d is None:
            continue
        kind, n = r["kind"], r["n"]
        if kind == "barrier":
            lbl = link.BARRIER_AR.get(r["detail"] or "other", "أخرى")
            d["barriers"][lbl] = d["barriers"].get(lbl, 0) + n
        else:
            field = {"booked": "booked", "cancelled": "cancelled", "result": "results", "early": "early", "referral": "referrals",
                     "walk": "walk_minutes", "helped": "helped", "contacted": "contacted"}.get(kind)
            if field:
                d[field] += n
    calls_now = db.one("SELECT COUNT(*) AS n FROM call_sessions WHERE status = 'active' AND created_at > ?",
                       (_now() - timedelta(minutes=15)).isoformat())["n"]
    return {"range": range, "districts": list(districts.values()), "feed": feed(db), "calls_now": calls_now,
            "interventions": interventions(db), "updated_at": _now().isoformat()}


FEED_AR = {
    "booked": "حجوزات جديدة في حي {d}: {n}", "cancelled": "مواعيد أُلغيت في حي {d}: {n}، ورفيدة تعيد الترتيب",
    "barrier": "سبب جديد ذكره سكان حي {d}: {x}", "result": "نتائج أدخلها الأطباء في حي {d}: {n}",
    "early": "اكتشاف مبكر في حي {d}، وأُحيل للطبيب", "referral": "إحالات جديدة من حي {d}: {n}",
    "walk": "دقائق مشي سجّلها سكان حي {d}: {n}", "helped": "جيران ساعدوهم في لعبة «حيّ عون» بحي {d}: {n}",
    "intervention": "اعتُمد لحي {d}: {x}", "contacted": "رفيدة تواصلت مع سكان في حي {d}: {n}",
}


def feed(db, limit: int = 12) -> list[dict]:
    """Recent activity grouped per district and kind, newest first."""
    rows = db.all("SELECT * FROM activity ORDER BY created_at DESC LIMIT 200")
    out, seen = [], {}
    for r in rows:
        key = (r["district"], r["kind"], r["detail"] if r["kind"] in ("barrier", "intervention") else None)
        if key in seen:
            seen[key]["n"] += r["n"]
            continue
        item = {"district": r["district"], "kind": r["kind"], "detail": r["detail"], "n": r["n"], "at": r["created_at"]}
        seen[key] = item
        out.append(item)
        if len(out) >= limit:
            break
    for it in out:
        ar = catalog.DISTRICTS.get(it["district"], (it["district"],))[0]
        x = link.BARRIER_AR.get(it["detail"] or "", "") if it["kind"] == "barrier" else (link.IV.get(it["detail"] or "", ("",))[0] if it["kind"] == "intervention" else "")
        it["text_ar"] = FEED_AR[it["kind"]].format(n=it["n"], d=ar, x=x)
    return out


def interventions(db) -> list[dict]:
    out = []
    for r in db.all("SELECT * FROM interventions ORDER BY status = 'approved', created_at DESC"):
        ar, en, dar, den = link.IV[r["kind"]]
        out.append({"id": r["id"], "district": r["district"], "district_ar": catalog.DISTRICTS[r["district"]][0],
                    "kind": r["kind"], "status": r["status"], "title_ar": ar, "title_en": en, "detail_ar": dar, "detail_en": den,
                    "approved_at": r["approved_at"], "slots": r["slots"]})
    return out


class ProposeIn(Strict):
    district: str = Field(min_length=3, max_length=20)
    kind: str = Field(pattern=r"^(mobile_clinic|evening_hours|transport|language|challenge)$")


@router.post("/api/interventions")
def propose(body: ProposeIn, request: Request, staff=Depends(current_staff)):
    if body.district not in catalog.DISTRICTS:
        raise HTTPException(404, "district_not_found")
    with request.app.state.db.tx() as c:
        c.execute("INSERT INTO interventions (id,district,kind,status,created_at) VALUES (?,?,?,?,?)",
                  (new_id("iv"), body.district, body.kind, "proposed", _now().isoformat()))
    return {"interventions": interventions(request.app.state.db)}


@router.post("/api/interventions/{iv_id}/approve")
def approve(iv_id: str, request: Request, staff=Depends(current_staff)):
    """A person approves; then the intervention changes what people in that district can book."""
    db = request.app.state.db
    with db.tx() as c:
        iv = c.execute("SELECT * FROM interventions WHERE id = ?", (iv_id,)).fetchone()
        if iv is None:
            raise HTTPException(404, "not_found")
        if iv["status"] != "approved":
            n = link.apply_intervention(c, request, iv)
            c.execute("UPDATE interventions SET status = 'approved', approved_at = ?, approved_by = ?, slots = ? WHERE id = ?",
                      (_now().isoformat(), staff, n, iv_id))
            link.record(c, iv["district"], "intervention", iv["kind"])
    return {"interventions": interventions(db)}
