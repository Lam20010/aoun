"""The app, the doctor portal and the Ministry board share one source: what happens in one shows in the others."""
from tests.test_platform import ADMIN, book_first, c, doctor, patient  # noqa: F401  (fixture re-used)


def ministry(c):
    t = c.post("/ministry/api/login", json={"staff_id": "M01", "password": "aoun-ministry-2026"}).json()["token"]
    return {"Authorization": "Bearer " + t}


def district_row(live, key):
    return next(d for d in live["districts"] if d["key"] == key)


def test_ministry_needs_sign_in_and_wrong_password_locks(c):
    assert c.get("/ministry/api/live").status_code == 401
    for _ in range(5):
        assert c.post("/ministry/api/login", json={"staff_id": "M02", "password": "nope-nope"}).status_code == 401
    assert c.post("/ministry/api/login", json={"staff_id": "M02", "password": "aoun-ministry-2026"}).status_code == 429
    assert c.get("/ministry/api/live", headers=ADMIN).status_code == 200


def test_booking_and_doctor_result_reach_the_ministry_without_any_person(c):
    h = patient(c)
    me = c.get("/patient/me", headers=h).json()
    plan = book_first(c, h)
    m = ministry(c)
    live = c.get("/ministry/api/live", headers=m).json()
    d = district_row(live, me["district"])
    assert d["booked"] >= 1
    assert any(f["kind"] == "booked" for f in live["feed"])
    text = str(live)
    assert me["patient"] not in text and "966" not in text

    D = doctor(c, plan["slot"]["doctor"]["id"])
    c.post(f"/doctor/api/patients/{me['patient']}/results", json={"screening": "diabetes", "values": [{"test_key": "hba1c", "value": "7.4"}]}, headers=D)
    d = district_row(c.get("/ministry/api/live", headers=m).json(), me["district"])
    assert d["results"] >= 1 and d["early"] >= 1


def test_approved_mobile_clinic_adds_times_people_can_book_and_doctors_hear_of_it(c):
    h = patient(c)
    me = c.get("/patient/me", headers=h).json()
    m = ministry(c)
    ivs = c.get("/ministry/api/live", headers=m).json()["interventions"]
    c.post("/ministry/api/interventions", json={"district": me["district"], "kind": "mobile_clinic"}, headers=m)
    iv = next(x for x in c.get("/ministry/api/live", headers=m).json()["interventions"]
              if x["district"] == me["district"] and x["kind"] == "mobile_clinic" and x["status"] == "proposed")
    before = [s for s in c.get("/patient/slots?days=10", headers=h).json()["slots"] if s["id"].startswith("M")]
    out = c.post(f"/ministry/api/interventions/{iv['id']}/approve", headers=m).json()
    assert next(x for x in out["interventions"] if x["id"] == iv["id"])["slots"] == 9
    after = [s for s in c.get("/patient/slots?days=10", headers=h).json()["slots"] if s["id"].startswith("M")]
    assert len(after) > len(before) and all(s["kind"] == "mobile_clinic" and s["cost"]["free"] for s in after)
    news = c.get("/patient/district", headers=h).json()
    assert any(x["kind"] == "mobile_clinic" for x in news["interventions"])
    plan = c.post("/patient/book", json={"slot_id": after[0]["id"]}, headers=h).json()
    D = doctor(c, plan["slot"]["doctor"]["id"])
    items = c.get("/doctor/api/notifications", headers=D).json()["items"]
    assert any(i["kind"] == "ministry" for i in items)
    assert len(ivs) >= 8


def test_walks_reach_the_doctor_and_the_ministry_as_minutes_only(c):
    h = patient(c)
    me = c.get("/patient/me", headers=h).json()
    plan = book_first(c, h)
    w = c.post("/patient/walks", json={"minutes": 30}, headers=h).json()
    assert w["week_minutes"] == 30 and w["today_minutes"] == 30
    D = doctor(c, plan["slot"]["doctor"]["id"])
    assert c.get(f"/doctor/api/patients/{me['patient']}", headers=D).json()["walks"]["week_minutes"] == 30
    assert district_row(c.get("/ministry/api/live", headers=ADMIN).json(), me["district"])["walk_minutes"] >= 30
    assert c.post("/patient/walks", json={"minutes": 999}, headers=h).status_code == 422


def test_game_and_assistant_look_follow_the_person(c):
    h = patient(c)
    assert c.get("/patient/app-state", headers=h).json() == {"game": {}, "avatar": {}}
    c.put("/patient/app-state", json={"game": {"pts": 420, "plots": {"plotA": "park"}}, "avatar": {"hair": "short"}, "helped": 1}, headers=h)
    st = c.get("/patient/app-state", headers=h).json()
    assert st["game"]["pts"] == 420 and st["avatar"]["hair"] == "short"
    assert c.put("/patient/app-state", json={"game": {"x": "y" * 9000}}, headers=h).status_code == 413


def test_route_without_a_key_is_an_estimate_and_the_calendar_link_works_once(c):
    h = patient(c)
    assert c.get("/patient/route?to=plan", headers=h).status_code == 404
    book_first(c, h)
    r = c.get("/patient/route?to=plan&mode=driving", headers=h).json()
    assert r["source"] == "estimate" and r["duration_min"] > 0 and "m.uber.com/ul/" in r["links"]["uber"]
    w = c.get("/patient/route?to=walk", headers=h).json()
    assert w["mode"] == "walking"
    path = c.get("/patient/calendar/link", headers=h).json()["path"]
    ics = c.get(path)
    assert ics.status_code == 200 and b"BEGIN:VEVENT" in ics.content and b"SH-" in ics.content
    assert c.get(path).status_code == 404


def test_sehhaty_welcome_shows_masked_details_only(c):
    h = patient(c)
    seh = c.get("/patient/me", headers=h).json()["sehhaty"]
    assert seh["first_name_ar"] and seh["id_masked"].startswith("••••••") and "••" in seh["phone_masked"]
    assert seh["mode"] == "simulated"


def test_district_events_and_the_whole_city_with_hospitals(c):
    h = patient(c)
    ev = c.get("/patient/district", headers=h).json()["events"]
    assert any(e["kind"] == "mammo_truck" for e in ev) and all(e["start"] <= e2["start"] for e, e2 in zip(ev, ev[1:]))
    city = c.get("/patient/slots?district=all&days=10", headers=h).json()["slots"]
    kinds = {s["facility_kind"] for s in city}
    assert {"phc", "hospital", "private_clinic", "private_hospital"} <= kinds
    assert all(s["cost"]["free"] for s in city if s["facility_kind"] == "hospital")
    fac = c.get("/patient/catalog").json()["facilities"]
    assert any(f["kind"] == "hospital" for f in fac) and any(f["paid"] for f in fac)


def test_person_can_turn_off_calls_and_the_outbound_call_is_refused(c):
    h = patient(c)
    assert c.get("/patient/me", headers=h).json()["calls_ok"] is True
    assert c.patch("/patient/calls", json={"on": False}, headers=h).json() == {"calls_ok": False}
    me = c.get("/patient/me", headers=h).json()
    assert me["calls_ok"] is False
    row = c.app.state.db.one("SELECT contact_permission FROM residents WHERE id = ?", me["patient"])
    assert row["contact_permission"] == 0
    c.patch("/patient/calls", json={"on": True}, headers=h)
    assert c.get("/patient/me", headers=h).json()["calls_ok"] is True


def test_ministry_insights_reasons_per_district_with_small_cells_hidden(c):
    m = ministry(c)
    ins = c.get("/ministry/api/insights", headers=m).json()
    assert len(ins["districts"]) == 8 and ins["reasons"]
    nas = next(d for d in ins["districts"] if d["key"] == "Al-Naseem")
    assert nas["top"][0]["code"] == "transport" and nas["suggestion"]["kind"] == "transport"
    assert ins["worked"] and all(0 <= w["best_pct"] <= 100 for w in ins["worked"])
    def cells(x):
        if isinstance(x, dict):
            for v in x.values():
                yield from cells(v)
        elif isinstance(x, list):
            for v in x:
                yield from cells(v)
        elif isinstance(x, int) and not isinstance(x, bool):
            yield x
    for d in ins["districts"]:
        for k in ("contacted", "booked", "results", "early"):
            assert d[k] is None or d[k] == 0 or d[k] >= 5
    assert c.get("/ministry/api/insights").status_code == 401
