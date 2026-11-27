"""The patient app API and the doctor portal: booking with a doctor, a health record from many
facilities, results, files, medicines, messages, access log, and the privacy rules around them."""
import base64

import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.tools import booking_text

TOOL = {"X-Aoun-Key": "tool-key-for-tests-123"}
ADMIN = {"X-Admin-Key": "admin-key-for-tests-456"}
PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"


@pytest.fixture()
def c(tmp_path):
    s = Settings(tool_key=TOOL["X-Aoun-Key"], admin_key=ADMIN["X-Admin-Key"], webhook_secret="w",
                 phone_enc_key=Fernet.generate_key().decode(), db_path=str(tmp_path / "p.db"),
                 elevenlabs_api_key="", phone_number_id="", agent_rafeed="a1", agent_rufaida="a2",
                 token_ttl_minutes=60, demo_now="2026-11-26T09:00:00+03:00", demo_mode=True)
    return TestClient(create_app(s))


def patient(c, lang="ar"):
    t = c.post("/patient/demo", json={"gender": "f", "lang": lang}).json()["token"]
    return {"Authorization": "Bearer " + t}


def doctor(c, did):
    t = c.post("/doctor/api/login", json={"doctor_id": did, "code": "aoun-demo-2026"}).json()["token"]
    return {"Authorization": "Bearer " + t}


def book_first(c, h):
    slots = c.get("/patient/slots", headers=h).json()["slots"]
    assert slots and all("doctor" in s for s in slots)
    plan = c.post("/patient/book", json={"slot_id": slots[0]["id"]}, headers=h).json()
    return plan


def test_patient_api_needs_a_token(c):
    assert c.get("/patient/me").status_code == 401
    assert c.get("/patient/me", headers={"Authorization": "Bearer " + "x" * 40}).status_code == 401


def test_record_brings_history_from_several_facilities(c):
    h = patient(c)
    rec = c.get("/patient/records", headers=h).json()["records"]
    kinds = {r["facility"]["kind"] for r in rec}
    assert len(rec) >= 5 and len(kinds) >= 2
    assert all(r["source"] == "history" for r in rec)


def test_booking_shows_doctor_clinic_and_map_point_and_moving_frees_the_old_place(c):
    h = patient(c)
    plan = book_first(c, h)
    s = plan["slot"]
    assert plan["confirmed"] and s["doctor"]["name_ar"] and "غرفة" in s["doctor"]["clinic_ar"]
    assert s["lat"] and s["lon"]
    first = s["id"]
    db = c.app.state.db
    before = db.one("SELECT remaining FROM slots WHERE id = ?", first)["remaining"]
    other = [x for x in c.get("/patient/slots", headers=h).json()["slots"] if x["id"] != first][0]
    c.post("/patient/book", json={"slot_id": other["id"]}, headers=h)
    assert db.one("SELECT remaining FROM slots WHERE id = ?", first)["remaining"] == before + 1
    assert c.get("/patient/plan", headers=h).json()["slot"]["id"] == other["id"]


def test_doctor_sees_only_people_booked_with_them_and_the_person_sees_who_opened(c):
    h = patient(c)
    plan = book_first(c, h)
    did = plan["slot"]["doctor"]["id"]
    other = "D02" if did != "D02" else "D01"
    me = c.get("/patient/me", headers=h).json()["patient"]
    assert c.get(f"/doctor/api/patients/{me}", headers=doctor(c, other)).status_code == 403
    dh = doctor(c, did)
    appts = c.get("/doctor/api/me", headers=dh).json()["appointments"]
    assert any(a["patient"] == me for a in appts)
    rec = c.get(f"/doctor/api/patients/{me}", headers=dh).json()
    assert len(rec["records"]) >= 5  # the whole history, from every facility
    log = c.get("/patient/access-log", headers=h).json()["entries"]
    assert log and log[0]["action"] == "viewed_record"


def test_doctor_login_needs_the_code(c):
    assert c.post("/doctor/api/login", json={"doctor_id": "D01", "code": "wrong-code"}).status_code == 401
    assert c.get("/doctor/api/me").status_code == 401


def test_results_notes_files_meds_and_messages_reach_the_app(c):
    h = patient(c)
    plan = book_first(c, h)
    did = plan["slot"]["doctor"]["id"]
    me = c.get("/patient/me", headers=h).json()["patient"]
    dh = doctor(c, did)
    r = c.post(f"/doctor/api/patients/{me}/results", headers=dh,
               json={"screening": "diabetes", "values": [{"test_key": "hba1c", "value": "6.1"}], "summary": "ما قبل السكري"})
    assert r.status_code == 200
    rec_id = r.json()["records"][0]
    assert c.post(f"/doctor/api/patients/{me}/notes", headers=dh, json={"body": "نعيد الفحص بعد ٦ أشهر"}).status_code == 200
    f = c.post(f"/doctor/api/patients/{me}/files", headers=dh, json={
        "filename": "report.pdf", "mime": "application/pdf", "data_b64": base64.b64encode(PDF).decode(), "record_id": rec_id})
    assert f.status_code == 200
    m = c.post(f"/doctor/api/patients/{me}/meds", headers=dh, json={
        "kind": "vitamin", "name_ar": "فيتامين د3", "name_en": "Vitamin D3", "dose": "1000 IU", "times": ["13:00", "08:00"],
        "days": 30, "with_food": True, "instructions": "بعد الغداء"})
    assert m.status_code == 200
    assert c.post(f"/doctor/api/patients/{me}/messages", headers=dh, json={"body": "كيف حالك؟"}).status_code == 200

    rec = c.get("/patient/records", headers=h).json()
    mine = [x for x in rec["records"] if x["source"] == "aoun"][0]
    assert mine["flag"] == "borderline" and mine["files"] and mine["doctor"]
    assert rec["notes"][0]["body"] == "نعيد الفحص بعد ٦ أشهر"
    meds = c.get("/patient/meds", headers=h).json()["meds"]
    active = [x for x in meds if x["active"]][0]
    assert active["times"] == ["08:00", "13:00"] and active["with_food"]
    assert c.post("/patient/messages", headers=h, json={"body": "الحمدلله"}).status_code == 200
    thread = c.get("/patient/messages", headers=h).json()
    assert [x["sender"] for x in thread["messages"]] == ["doctor", "patient"]

    link = c.get(f"/patient/files/{mine['files'][0]['id']}/link", headers=h).json()["path"]
    got = c.get(link)
    assert got.status_code == 200 and got.content == PDF
    assert c.get(link).status_code == 404  # one use only

    # encrypted at rest
    dump = "\n".join(c.app.state.db.conn.iterdump())
    assert "نعيد الفحص" not in dump and "كيف حالك" not in dump and "بعد الغداء" not in dump


def test_genetic_results_are_never_stored(c):
    h = patient(c)
    plan = book_first(c, h)
    me = c.get("/patient/me", headers=h).json()["patient"]
    dh = doctor(c, plan["slot"]["doctor"]["id"])
    r = c.post(f"/doctor/api/patients/{me}/results", headers=dh,
               json={"screening": "sickle_cell", "values": [{"test_key": "hbs", "value": "AS"}]})
    assert r.status_code == 422
    assert c.post(f"/doctor/api/patients/{me}/referral", headers=dh, json={"kind": "genetic_counselling"}).status_code == 200
    assert c.get("/patient/records", headers=h).json()["referrals"][0]["kind"] == "genetic_counselling"


def test_files_are_checked(c):
    h = patient(c)
    plan = book_first(c, h)
    me = c.get("/patient/me", headers=h).json()["patient"]
    dh = doctor(c, plan["slot"]["doctor"]["id"])
    bad = c.post(f"/doctor/api/patients/{me}/files", headers=dh, json={
        "filename": "x.pdf", "mime": "application/pdf", "data_b64": base64.b64encode(b"MZ not a pdf").decode()})
    assert bad.status_code == 415
    exe = c.post(f"/doctor/api/patients/{me}/files", headers=dh, json={
        "filename": "x.exe", "mime": "application/x-msdownload", "data_b64": base64.b64encode(b"MZ").decode()})
    assert exe.status_code == 415


def test_family_history_is_fixed_codes_and_adds_screenings(c):
    h = patient(c)
    assert c.put("/patient/family-history", headers=h, json={"codes": ["my aunt has diabetes"]}).status_code == 422
    c.put("/patient/family-history", headers=h, json={"codes": ["colorectal", "sickle_cell"]})
    me = c.get("/patient/me", headers=h).json()
    assert "colorectal" in [x["key"] for x in me["recommended"]]


def test_the_call_books_for_the_app_person_in_their_language(c):
    h = patient(c, "en")
    token = h["Authorization"].split()[1]
    k = c.post("/demo/start", json={"voice": "f", "lang": "en", "p": token}).json()["k"]
    c.post("/demo/bind", json={"k": k, "conversation_id": "conv_app_person_1"})
    appt = c.post("/tools/get_appointment", json={"conversation_id": "conv_app_person_1"}, headers=TOOL).json()
    assert appt["held"] and appt["doctor"].startswith("د.") and appt["doctor_en"].startswith("Dr.")
    done = c.post("/tools/confirm_booking", json={"conversation_id": "conv_app_person_1", "choice": "held", "language": "en"},
                  headers=TOOL).json()
    assert done["status"] == "confirmed" and done["language"] == "en"
    me = c.get("/patient/me", headers=h).json()
    assert me["language"] == "en" and me["plan"]["confirmed"]


def test_booking_text_in_each_language(c):
    db = c.app.state.db
    slot = db.one("SELECT * FROM slots WHERE id = 'S21'")
    assert "تم تأكيد" in booking_text(slot, "ar") and "د." in booking_text(slot, "ar")
    assert "confirmed" in booking_text(slot, "en") and "Dr." in booking_text(slot, "en")
    for lang in ("ur", "hi", "bn", "fil", "id"):
        assert "Aoun" in booking_text(slot, lang) or "عون" in booking_text(slot, lang) or "औन" in booking_text(slot, lang) or "আউন" in booking_text(slot, lang)


def test_doctor_notifications_show_bookings_and_messages_only_for_their_patients(c):
    h = patient(c)
    plan = book_first(c, h)
    did = plan["slot"]["doctor"]["id"]
    c.post("/patient/messages", headers=h, json={"body": "متى أصوم قبل الفحص؟"})
    items = c.get("/doctor/api/notifications", headers=doctor(c, did)).json()["items"]
    kinds = {i["kind"] for i in items}
    assert {"booking", "message"} <= kinds
    assert all(i["patient"] for i in items)
    other = "D02" if did != "D02" else "D01"
    assert c.get("/doctor/api/notifications", headers=doctor(c, other)).json()["items"] == []


def test_doctor_signs_in_with_id_and_password_and_wrong_tries_lock(c):
    ok = c.post("/doctor/api/login", json={"doctor_id": "d03", "password": "aoun-demo-2026"})
    assert ok.status_code == 200 and ok.json()["token"]
    assert c.post("/doctor/api/login", json={"doctor_id": "D99", "password": "aoun-demo-2026"}).json()["detail"] == "wrong_id_or_password"
    for _ in range(5):
        assert c.post("/doctor/api/login", json={"doctor_id": "D04", "password": "nope-nope"}).status_code == 401
    assert c.post("/doctor/api/login", json={"doctor_id": "D04", "password": "aoun-demo-2026"}).status_code == 429


def test_doctor_own_password_hash(c, monkeypatch):
    import json
    from app.doctor import hash_password
    monkeypatch.setenv("AOUN_DOCTOR_PASSWORDS", json.dumps({"D05": hash_password("Reem-Strong-Pass-1")}))
    assert c.post("/doctor/api/login", json={"doctor_id": "D05", "password": "aoun-demo-2026"}).status_code == 401
    assert c.post("/doctor/api/login", json={"doctor_id": "D05", "password": "Reem-Strong-Pass-1"}).status_code == 200


def test_messages_are_shown_in_the_reader_language(c, monkeypatch):
    from app import translate
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test")
    monkeypatch.setattr(translate, "translate", lambda text, target: f"[{target}] {text}")
    h = patient(c, "en")
    plan = book_first(c, h)
    me = c.get("/patient/me", headers=h).json()["patient"]
    dh = doctor(c, plan["slot"]["doctor"]["id"])
    c.post("/patient/messages", headers=h, json={"body": "Should I fast before the test?"})
    c.post(f"/doctor/api/patients/{me}/messages", headers=dh, json={"body": "نعم، صيام ٨ ساعات"})
    dm = c.get(f"/doctor/api/patients/{me}?lang=ar", headers=dh).json()["messages"]
    assert dm[0]["lang"] == "en" and dm[0]["translated"].startswith("[ar]") and "translated" not in dm[1]
    pm = c.get("/patient/messages", headers=h).json()["messages"]
    assert "translated" not in pm[0] and pm[1]["translated"].startswith("[en]")
    note = c.get("/doctor/api/notifications?lang=ar", headers=dh).json()["items"]
    assert any(i["kind"] == "message" and i["preview"].startswith("[ar]") for i in note)


def test_no_translation_without_a_key(c, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    h = patient(c, "en")
    book_first(c, h)
    c.post("/patient/messages", headers=h, json={"body": "Hello"})
    assert "translated" not in c.get("/patient/messages", headers=h).json()["messages"][0]
