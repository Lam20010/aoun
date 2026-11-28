"""What ties the three faces of Aoun together: the person's app, the doctor portal and the Ministry board.

- Every booking, cancellation, call reason, result, referral, walk and neighbour helped in the game is
  written to `activity` as a count for a district. No person, name, number or condition text is kept
  there, so the Ministry board can read it freely.
- The Ministry approves interventions for a district. An approved mobile clinic or evening hours adds
  real open times: the app's booking screen and the call agents offer them straight away, and the
  doctors of that district see a notification.
- The person's neighbourhood game and assistant look are kept on the server, so they follow the person.
- Walks the person logs show up for their doctor (this week's minutes) and as district totals for the
  Ministry. Only minutes are stored, never a route or a location.
"""
import json
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from . import catalog
from .security import new_id

RIYADH = timezone(timedelta(hours=3))

# ---------- activity ----------

KINDS = {"booked", "cancelled", "barrier", "result", "early", "referral", "walk", "helped", "intervention", "contacted",
         "answered", "pref", "ride", "resolved", "lang", "opted_out", "nurse"}

BARRIER_AR = {
    "transport": "المواصلات", "far": "بُعد المركز", "work_hours": "تعارض المواعيد مع الدوام", "fear": "الخوف من الفحص",
    "no_need": "قلة الوعي", "needs_companion": "المواصلات", "embarrassment": "تفضيل طبيبة", "cost_concern": "التكلفة",
    "language": "حاجز اللغة", "childcare": "رعاية الأطفال", "other": "أخرى", "sooner": "يبغى موعد أقرب",
    "already_screened": "فحص مؤخرًا في مكان ثاني", "call_later": "مشغول وقت المكالمة", "mistrust": "ما وثق في المكالمة",
}
BARRIER_EN = {
    "transport": "Transport", "far": "Distance", "work_hours": "Work hours", "fear": "Fear of the test", "no_need": "Low awareness",
    "needs_companion": "Transport", "embarrassment": "Prefers a woman doctor", "cost_concern": "Cost", "language": "Language",
    "childcare": "Childcare", "other": "Other", "sooner": "Wants it sooner",
    "already_screened": "Screened elsewhere", "call_later": "Busy at call time", "mistrust": "Did not trust the call",
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def record(c, district: str, kind: str, detail: str | None = None, n: int = 1) -> None:
    """Add one count to the district's activity. `c` is an open cursor inside the caller's transaction."""
    if kind not in KINDS or district not in catalog.DISTRICTS:
        return
    c.execute("INSERT INTO activity VALUES (?,?,?,?,?,?)", (new_id("act"), district, kind, detail, n, _now().isoformat()))


def record_case(c, case_id: str, kind: str, detail: str | None = None) -> None:
    row = c.execute("SELECT r.district FROM cases x JOIN residents r ON r.id = x.resident_id WHERE x.id = ?", (case_id,)).fetchone()
    if row:
        record(c, row["district"], kind, detail)


# ---------- interventions ----------

IV = {
    "mobile_clinic": ("عيادة متنقلة عند جامع الحي", "Mobile clinic by the district mosque",
                      "تضيف مواعيد مجانية قريبة من البيوت لثلاث أيام", "Adds free times close to homes for three days"),
    "evening_hours": ("مواعيد مسائية", "Evening hours",
                      "تفتح المركز الصحي ٨ و٩ بالليل لمدة أسبوع", "Opens the health center at 8 and 9 pm for a week"),
    "transport": ("دعم المواصلات", "Transport support",
                  "مشوار مجاني للموعد لكل من في الحي", "A free ride to the appointment for everyone in the district"),
    "language": ("تواصل بلغات العمالة", "Outreach in workers' languages",
                 "رفيدة تتصل بالأوردو والهندية والبنغالية", "Rufaida calls in Urdu, Hindi and Bengali"),
    "challenge": ("تحدي «حيّ صحي»", "“Healthy district” challenge",
                  "هدف جماعي للحي يظهر في تطبيق كل ساكن", "A shared goal for the district, shown in everyone's app"),
}
# What each barrier suggests (the Ministry agent's proposal; a person always approves).
FOR_BARRIER = {"transport": "transport", "needs_companion": "transport", "far": "mobile_clinic", "work_hours": "evening_hours",
               "language": "language", "childcare": "mobile_clinic", "fear": "challenge", "no_need": "challenge"}
DEFAULT_IV = {"Qurtubah": "mobile_clinic", "Al-Naseem": "transport", "Al-Yarmouk": "language", "Al-Malqa": "evening_hours",
              "Al-Olaya": "evening_hours", "Al-Rawdah": "challenge", "Al-Aziziyah": "mobile_clinic", "Al-Suwaidi": "transport"}
CHALLENGE_GOAL = 30  # bookings + walks in a week


SOLUTION_AR = {"ride": "مشوار للموعد", "after_work": "موعد بعد الدوام", "mobile_clinic": "عيادة متنقلة قريبة", "home_visit": "زيارة منزلية",
               "female_doctor": "طبيبة", "private": "عيادة خاصة (أقرب)", "same_time": "شرح وطمأنة بنفس الموعد", "other": "أخرى"}
SOLUTION_EN = {"ride": "A ride", "after_work": "After-work time", "mobile_clinic": "Mobile clinic nearby", "home_visit": "Home visit",
               "female_doctor": "Woman doctor", "private": "Private clinic (sooner)", "same_time": "Explained, same time", "other": "Other"}
PREF_AR = {"female_doctor": "طبيبة", "wheelchair_center": "مركز يدعم الكرسي المتحرك", "home_test": "فحص منزلي",
           "companion_reminders": "مرافق يستلم التذكير", "virtual_consult": "استشارة فيديو قبلها"}
LANG_AR = {"ar": "العربية", "en": "الإنجليزية", "ur": "الأوردو", "hi": "الهندية", "bn": "البنغالية", "fil": "الفلبينية", "id": "الإندونيسية"}

# Demo history for the pilot districts (only in demo mode, only on an empty table): what months of calls
# would look like, so the Ministry board has something real-shaped to show. Live activity adds on top.
_PROFILE = {
    "Qurtubah":    ({"work_hours": 30, "no_need": 16, "far": 10, "fear": 9, "call_later": 10, "sooner": 6, "other": 5}, {"ar": 96, "en": 4}),
    "Al-Naseem":   ({"transport": 34, "childcare": 15, "cost_concern": 11, "no_need": 12, "fear": 8, "needs_companion": 8, "other": 4}, {"ar": 97, "en": 3}),
    "Al-Yarmouk":  ({"language": 33, "work_hours": 22, "mistrust": 11, "transport": 9, "no_need": 8, "cost_concern": 7, "other": 4}, {"ar": 55, "ur": 18, "hi": 14, "bn": 13}),
    "Al-Malqa":    ({"work_hours": 34, "sooner": 16, "already_screened": 15, "call_later": 12, "no_need": 9, "other": 4}, {"ar": 90, "en": 10}),
    "Al-Olaya":    ({"work_hours": 40, "sooner": 19, "call_later": 15, "no_need": 9, "already_screened": 8, "other": 4}, {"ar": 78, "en": 15, "fil": 7}),
    "Al-Rawdah":   ({"fear": 26, "no_need": 24, "embarrassment": 11, "work_hours": 10, "already_screened": 9, "needs_companion": 7, "other": 4}, {"ar": 98, "en": 2}),
    "Al-Aziziyah": ({"far": 29, "transport": 20, "childcare": 14, "language": 11, "work_hours": 9, "cost_concern": 6, "other": 4}, {"ar": 70, "bn": 14, "fil": 9, "ur": 7}),
    "Al-Suwaidi":  ({"transport": 25, "cost_concern": 16, "mistrust": 15, "fear": 11, "no_need": 10, "childcare": 7, "other": 4}, {"ar": 92, "ur": 8}),
}
_WORKS = {"transport": {"ride": 6, "mobile_clinic": 3}, "far": {"mobile_clinic": 6, "ride": 3}, "work_hours": {"after_work": 7, "private": 2},
          "fear": {"female_doctor": 4, "same_time": 5}, "childcare": {"mobile_clinic": 5, "home_visit": 4}, "language": {"same_time": 8},
          "embarrassment": {"female_doctor": 9}, "cost_concern": {"same_time": 9}, "sooner": {"private": 6, "after_work": 3},
          "mistrust": {"same_time": 8}, "no_need": {"same_time": 9}, "needs_companion": {"ride": 5, "female_doctor": 3},
          "call_later": {"same_time": 6, "after_work": 3}, "other": {"same_time": 7}}


def seed_activity_demo(db) -> None:
    import random
    if db.one("SELECT COUNT(*) AS n FROM activity")["n"]:
        return
    rnd = random.Random(42)
    now = _now()
    def pick(weights: dict) -> str:
        return rnd.choices(list(weights), weights=list(weights.values()))[0]
    rows = []
    for d, (bars, langs) in _PROFILE.items():
        for week in range(16):
            at = (now - timedelta(days=7 * week + rnd.randint(0, 6), hours=rnd.randint(0, 10))).isoformat()
            agg: dict[tuple, int] = {}
            def add(kind, detail=None, n=1):
                agg[(kind, detail)] = agg.get((kind, detail), 0) + n
            contacted = rnd.randint(28, 52)
            add("contacted", n=contacted)
            for _ in range(contacted):
                if rnd.random() > 0.78:
                    continue
                add("answered")
                add("lang", pick(langs))
                reason = pick(bars) if rnd.random() < 0.62 else None
                if reason:
                    add("barrier", reason)
                if rnd.random() < 0.03:
                    add("opted_out"); continue
                if reason in ("already_screened",) or (reason and rnd.random() < 0.28) or (not reason and rnd.random() < 0.25):
                    continue
                add("booked")
                sol = pick(_WORKS.get(reason or "other", {"same_time": 1})) if reason else "same_time"
                add("resolved", f"{reason or 'none'}:{sol}")
                if sol == "ride":
                    add("ride", "metro" if rnd.random() < 0.3 else "car")
                for code, p in (("female_doctor", 0.35), ("wheelchair_center", 0.05), ("home_test", 0.06), ("companion_reminders", 0.12), ("virtual_consult", 0.08)):
                    if rnd.random() < p:
                        add("pref", code)
                if rnd.random() < 0.72:
                    add("result")
                    if rnd.random() < 0.07:
                        add("early", "diabetes"); add("referral", "specialist")
            for (kind, detail), n in agg.items():
                rows.append((new_id("act"), d, kind, detail, n, at))
    with db.tx() as c:
        c.executemany("INSERT INTO activity VALUES (?,?,?,?,?,?)", rows)


def seed_interventions(db) -> None:
    if db.one("SELECT COUNT(*) AS n FROM interventions")["n"]:
        return
    with db.tx() as c:
        for d, k in DEFAULT_IV.items():
            c.execute("INSERT INTO interventions (id,district,kind,status,created_at) VALUES (?,?,?,?,?)",
                      (new_id("iv"), d, k, "proposed", _now().isoformat()))


def _today(request: Request) -> date:
    st = request.app.state.settings
    now = datetime.fromisoformat(st.demo_now) if (st.demo_mode and st.demo_now) else _now()
    return now.astimezone(RIYADH).date()


def apply_intervention(c, request: Request, iv) -> int:
    """Turn an approved intervention into open times people can book. Returns how many were added."""
    d = iv["district"]
    fid = catalog.phc_for(d)
    f = catalog.facility(fid)
    docs = catalog.doctors_at(fid)
    female = [x for x in docs if catalog.doctor(x)["gender"] == "f"] or docs
    lat, lon = catalog.DISTRICTS[d][2], catalog.DISTRICTS[d][3]
    start = _today(request) + timedelta(days=1)
    rows = []
    if iv["kind"] == "mobile_clinic":
        day, added = start, 0
        while added < 3:
            if day.weekday() != 4:
                for t in ("16:00", "17:00", "18:00"):
                    rows.append((f"M{fid[2:]}{day.strftime('%m%d')}{t.replace(':', '')}", "العيادة المتنقلة عند جامع " + catalog.DISTRICTS[d][0],
                                 d, "general", f"{day.isoformat()}T{t}:00+03:00", 4, 1, 0, "mobile_clinic", 1, 1,
                                 lat - 0.004, lon - 0.004, fid, female[0]))
                added += 1
            day += timedelta(days=1)
    elif iv["kind"] == "evening_hours":
        for i in range(7):
            day = start + timedelta(days=i)
            if day.weekday() == 4:
                continue
            for j, t in enumerate(("20:00", "21:00")):
                doc = docs[(i + j) % len(docs)]
                rows.append((f"E{fid[2:]}{day.strftime('%m%d')}{t.replace(':', '')}", f["name_ar"], d, "general",
                             f"{day.isoformat()}T{t}:00+03:00", 2, int(f["wheelchair"]), 1, "center",
                             int(catalog.doctor(doc)["gender"] == "f"), 1, f["lat"], f["lon"], fid, doc))
    for r in rows:
        c.execute("INSERT OR IGNORE INTO slots VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", r)
    return len(rows)


def active(db, district: str) -> list[dict]:
    """Approved interventions for a district, as the app and the agents describe them."""
    out = []
    for r in db.all("SELECT * FROM interventions WHERE district = ? AND status = 'approved' ORDER BY approved_at DESC", district):
        ar, en, dar, den = IV[r["kind"]]
        item = {"id": r["id"], "kind": r["kind"], "title_ar": ar, "title_en": en, "detail_ar": dar, "detail_en": den,
                "approved_at": r["approved_at"], "slots": r["slots"]}
        if r["kind"] == "challenge":
            since = (_now() - timedelta(days=7)).isoformat()
            n = db.one("""SELECT COALESCE(SUM(n),0) AS n FROM activity WHERE district = ? AND kind IN ('booked','walk','helped')
                          AND created_at > ?""", district, since)["n"]
            item.update(progress=min(n, CHALLENGE_GOAL), goal=CHALLENGE_GOAL)
        out.append(item)
    return out


def transport_supported(db, district: str) -> bool:
    return bool(db.one("SELECT 1 AS x FROM interventions WHERE district = ? AND kind = 'transport' AND status = 'approved'", district))


# ---------- the person's app: game, assistant look, walks, district news ----------

class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class StateIn(Strict):
    game: dict | None = None
    avatar: dict | None = None
    helped: int = Field(default=0, ge=0, le=4)   # neighbours newly helped in the game since the last save


class WalkIn(Strict):
    minutes: int = Field(ge=1, le=240)


def _small(obj: dict | None, limit: int = 8000) -> str | None:
    if obj is None:
        return None
    s = json.dumps(obj, ensure_ascii=False)
    if len(s) > limit:
        raise HTTPException(413, "too_large")
    return s


def patient_router(current_patient) -> APIRouter:
    r = APIRouter(prefix="/patient")

    @r.get("/app-state")
    def get_state(request: Request, p=Depends(current_patient)):
        row = request.app.state.db.one("SELECT * FROM app_state WHERE resident_id = ?", p["id"])
        return {"game": json.loads(row["game"]) if row else {}, "avatar": json.loads(row["avatar"]) if row else {}}

    @r.put("/app-state")
    def put_state(body: StateIn, request: Request, p=Depends(current_patient)):
        db = request.app.state.db
        g, a = _small(body.game), _small(body.avatar, 2000)
        with db.tx() as c:
            c.execute("INSERT OR IGNORE INTO app_state (resident_id) VALUES (?)", (p["id"],))
            if g is not None:
                c.execute("UPDATE app_state SET game = ?, updated_at = ? WHERE resident_id = ?", (g, _now().isoformat(), p["id"]))
            if a is not None:
                c.execute("UPDATE app_state SET avatar = ?, updated_at = ? WHERE resident_id = ?", (a, _now().isoformat(), p["id"]))
            if body.helped:
                record(c, p["district"], "helped", None, body.helped)
        return {"ok": True}

    @r.post("/walks")
    def add_walk(body: WalkIn, request: Request, p=Depends(current_patient)):
        db = request.app.state.db
        with db.tx() as c:
            c.execute("INSERT INTO walks VALUES (?,?,?,?,?)", (new_id("wk"), p["id"], body.minutes, _today(request).isoformat(), _now().isoformat()))
            record(c, p["district"], "walk", None, body.minutes)
        return walks_view(db, p["id"], _today(request))

    @r.get("/walks")
    def get_walks(request: Request, p=Depends(current_patient)):
        return walks_view(request.app.state.db, p["id"], _today(request))

    @r.get("/district")
    def district_news(request: Request, p=Depends(current_patient)):
        """What the Ministry has done for the person's district: shown on the home screen and in the game."""
        db = request.app.state.db
        d = p["district"]
        return {"district": d, "district_ar": catalog.DISTRICTS[d][0], "district_en": catalog.DISTRICTS[d][1],
                "interventions": active(db, d), "events": events(db, d, _today(request))}

    return r


# Health events in the district (demo calendar, dates move with today). Approved Ministry interventions join them.
def events(db, district: str, today: date) -> list[dict]:
    ar, en, lat, lon = catalog.DISTRICTS[district]
    def nxt(weekday: int, min_days: int = 0) -> date:
        d = today + timedelta(days=min_days)
        while d.weekday() != weekday:
            d += timedelta(days=1)
        return d
    def at(d: date, hm: str) -> str:
        return f"{d.isoformat()}T{hm}:00+03:00"
    truck = today + timedelta(days=2 if today.weekday() != 2 else 3)
    out = [
        {"id": f"ev-mammo-{district}", "kind": "mammo_truck", "start": at(truck, "09:00"), "end": at(truck, "16:00"),
         "title_ar": "عربة الكشف المبكر عن سرطان الثدي", "title_en": "Breast cancer screening truck",
         "place_ar": f"حديقة حي {ar}", "place_en": f"{en} park", "lat": lat + 0.002, "lon": lon + 0.0025,
         "who_ar": "للسيدات من ٤٠ سنة وفوق · بدون موعد", "who_en": "Women 40+ · walk in", "free": True},
        {"id": f"ev-bp-{district}", "kind": "bp_check", "start": at(nxt(4), "12:30"), "end": at(nxt(4), "14:00"),
         "title_ar": "قياس ضغط وسكر مجاني", "title_en": "Free blood pressure and sugar check",
         "place_ar": f"جامع حي {ar} · بعد صلاة الجمعة", "place_en": f"{en} mosque · after Friday prayer", "lat": lat - 0.004, "lon": lon - 0.004,
         "who_ar": "للجميع", "who_en": "Everyone", "free": True},
        {"id": f"ev-walk-{district}", "kind": "group_walk", "start": at(nxt(5), "06:30"), "end": at(nxt(5), "07:30"),
         "title_ar": "مشي جماعي في ممشى الحي", "title_en": "Group walk at the district walkway",
         "place_ar": f"ممشى {ar}", "place_en": f"{en} walkway", "lat": lat + 0.002, "lon": lon + 0.0025,
         "who_ar": "للعائلة كلها", "who_en": "The whole family", "free": True},
        {"id": f"ev-flu-{district}", "kind": "vaccine", "start": at(today + timedelta(days=1), "08:00"), "end": at(today + timedelta(days=6), "16:00"),
         "title_ar": "حملة لقاح الإنفلونزا الموسمية", "title_en": "Seasonal flu vaccine campaign",
         "place_ar": f"مركز صحي {ar}", "place_en": f"{en} Health Center", "lat": lat, "lon": lon,
         "who_ar": "احجزي من صحتي أو تعالي مباشرة", "who_en": "Book in Sehhaty or walk in", "free": True},
        {"id": f"ev-talk-{district}", "kind": "talk", "start": at(nxt(1, 1), "19:00"), "end": at(nxt(1, 1), "20:00"),
         "title_ar": "لقاء توعوي: السكري والأكل الصحي", "title_en": "Talk: diabetes and healthy eating",
         "place_ar": f"مركز حي {ar}", "place_en": f"{en} community center", "lat": lat - 0.002, "lon": lon + 0.003,
         "who_ar": "مع أخصائية تغذية", "who_en": "With a dietitian", "free": True},
    ]
    for iv in active(db, district):
        if iv["kind"] in ("mobile_clinic", "evening_hours"):
            d = date.fromisoformat(iv["approved_at"][:10]) + timedelta(days=1)
            out.append({"id": "ev-" + iv["id"], "kind": iv["kind"], "start": at(d, "16:00" if iv["kind"] == "mobile_clinic" else "20:00"),
                        "end": at(d + timedelta(days=2 if iv["kind"] == "mobile_clinic" else 6), "18:00" if iv["kind"] == "mobile_clinic" else "21:00"),
                        "title_ar": iv["title_ar"], "title_en": iv["title_en"],
                        "place_ar": "عند جامع الحي" if iv["kind"] == "mobile_clinic" else f"مركز صحي {ar}",
                        "place_en": "By the district mosque" if iv["kind"] == "mobile_clinic" else f"{en} Health Center",
                        "lat": lat - 0.004, "lon": lon - 0.004, "who_ar": "مواعيد جديدة من الوزارة · احجزي من التطبيق",
                        "who_en": "New times from the Ministry · book in the app", "free": True, "bookable": True})
    return sorted(out, key=lambda e: e["start"])


def walks_view(db, rid: str, today: date) -> dict:
    week0 = (today - timedelta(days=6)).isoformat()
    rows = db.all("SELECT day, SUM(minutes) AS m FROM walks WHERE resident_id = ? AND day >= ? GROUP BY day", rid, week0)
    by = {r["day"]: r["m"] for r in rows}
    days = [(today - timedelta(days=6 - i)).isoformat() for i in range(7)]
    return {"week_minutes": sum(by.values()), "goal_minutes": 150, "today_minutes": by.get(today.isoformat(), 0),
            "days": [{"day": d, "minutes": by.get(d, 0)} for d in days]}
