import hashlib
import hmac
import json
import threading
import time

import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

TOOL = {"X-Aoun-Key": "tool-key-for-tests-123"}
ADMIN = {"X-Admin-Key": "admin-key-for-tests-456"}
WEBHOOK_SECRET = "whsec-for-tests"
PHONES = [f"+96650000010{i}" for i in range(1, 6)]


@pytest.fixture()
def client(tmp_path):
    s = Settings(tool_key=TOOL["X-Aoun-Key"], admin_key=ADMIN["X-Admin-Key"], webhook_secret=WEBHOOK_SECRET,
                 phone_enc_key=Fernet.generate_key().decode(), db_path=str(tmp_path / "t.db"),
                 elevenlabs_api_key="", phone_number_id="", agent_rafeed="a1", agent_rufaida="a2",
                 token_ttl_minutes=60, demo_now="2026-11-26T09:00:00+03:00")
    return TestClient(create_app(s))


_n = [0]


def start(client, case="C01"):
    """Open a call session bound to a fresh conversation id, as a real outbound call would be."""
    _n[0] += 1
    conv = f"conv_test_{case}_{_n[0]:04d}"
    r = client.post("/admin/calls", json={"case_id": case, "conversation_id": conv}, headers=ADMIN)
    assert r.status_code == 200, r.text
    return conv


def text(resp):
    return resp.text


# ---------- access control ----------

def test_tools_reject_missing_or_wrong_key(client):
    tok = start(client)
    assert client.post("/tools/get_appointment", json={"conversation_id": tok}).status_code == 401
    assert client.post("/tools/get_appointment", json={"conversation_id": tok},
                       headers={"X-Aoun-Key": "wrong"}).status_code == 401


def test_admin_rejects_tool_key(client):
    assert client.post("/admin/calls", json={"case_id": "C01"}, headers={"X-Admin-Key": TOOL["X-Aoun-Key"]}).status_code == 401
    assert client.get("/ministry/kpis", headers={"X-Admin-Key": "nope"}).status_code == 401


def test_unknown_token_is_rejected(client):
    r = client.post("/tools/get_appointment", json={"conversation_id": "ct_" + "x" * 40}, headers=TOOL)
    assert r.status_code == 403


def test_docs_are_disabled(client):
    assert client.get("/docs").status_code == 404
    assert client.get("/openapi.json").status_code == 404


# ---------- outreach rules ----------

def test_declined_and_not_due_cases_cannot_be_called(client):
    assert client.post("/admin/calls", json={"case_id": "C04"}, headers=ADMIN).status_code == 409  # declined
    assert client.post("/admin/calls", json={"case_id": "C05"}, headers=ADMIN).status_code == 409  # not due
    q = client.get("/admin/due_queue", headers=ADMIN).json()["queue"]
    assert [x["case_id"] for x in q] == ["C02", "C01", "C03"]


# ---------- conversation flow ----------

def tool(client, name, tok, **kw):
    return client.post(f"/tools/{name}", json={"conversation_id": tok, **kw}, headers=TOOL)


def test_held_appointment_is_read_and_confirmed(client):
    tok = start(client)
    a = tool(client, "get_appointment", tok).json()
    assert a["held"] and a["center"] and a["when"]
    r1 = tool(client, "confirm_booking", tok, choice="held")
    assert r1.status_code == 200 and r1.json()["status"] == "confirmed"
    r2 = tool(client, "confirm_booking", tok, choice="held")
    assert r2.json()["booking_ref"] == r1.json()["booking_ref"] and r2.json()["replayed"]


def test_refusal_gets_solutions_and_switching_releases_the_hold(client):
    db = client.app.state.db
    tok = start(client)
    held_slot = db.one("SELECT slot_id FROM holds")["slot_id"]
    before = db.one("SELECT remaining FROM slots WHERE id=?", held_slot)["remaining"]
    assert tool(client, "record_barrier", tok, reason="work_hours").status_code == 200
    sol = tool(client, "get_solutions", tok, reason="work_hours").json()
    assert sol["options"] and all(o["choice"].startswith("of_") for o in sol["options"])
    assert all(("المساء" in o["when"]) or ("الجمعة" in o["when"]) or ("السبت" in o["when"]) for o in sol["options"])
    r = tool(client, "confirm_booking", tok, choice=sol["options"][0]["choice"])
    assert r.status_code == 200
    assert db.one("SELECT remaining FROM slots WHERE id=?", held_slot)["remaining"] == before + 1
    assert db.one("SELECT status FROM holds")["status"] == "released"
    assert db.one("SELECT reason FROM barriers")["reason"] == "work_hours"


def test_each_reason_gets_a_fitting_plan(client):
    tok = start(client)
    emb = tool(client, "get_solutions", tok, reason="embarrassment").json()
    assert emb["options"] and all(o["female_staff"] for o in emb["options"])
    comp = tool(client, "get_solutions", tok, reason="needs_companion").json()
    assert comp["options"] and all(o["companion_welcome"] for o in comp["options"])
    cost = tool(client, "get_solutions", tok, reason="cost_concern").json()
    assert [o["choice"] for o in cost["options"]] == ["held"] and "free" in cost["plan"]
    fear = tool(client, "get_solutions", tok, reason="fear").json()
    assert fear["extras"] and "nurse" in fear["extras"][0]


def test_cannot_confirm_option_from_another_call(client):
    t1 = start(client, "C01")
    opt = tool(client, "get_solutions", t1, reason="other").json()["options"][0]["choice"]
    t2 = start(client, "C02")
    assert tool(client, "confirm_booking", t2, choice=opt).status_code == 409


def test_last_place_race_gives_one_booking(client):
    db = client.app.state.db
    with db.tx() as c:  # make C03 a Qurtubah diabetes case too, just for this race
        c.execute("UPDATE residents SET district='Qurtubah' WHERE id='R03'")
        c.execute("UPDATE cases SET screening='diabetes' WHERE id='C03'")
    toks = [start(client, "C01"), start(client, "C03")]
    choices = []
    for t in toks:
        opts = tool(client, "get_solutions", t, reason="work_hours").json()["options"]
        o = [x for x in opts if x["when"].startswith("الأحد")][0]  # Sunday evening: one place left
        choices.append(o["choice"])
    results = []

    def go(t, ch):
        results.append(tool(client, "confirm_booking", t, choice=ch).status_code)

    threads = [threading.Thread(target=go, args=(t, ch)) for t, ch in zip(toks, choices)]
    [th.start() for th in threads]
    [th.join() for th in threads]
    assert sorted(results) == [200, 409]
    assert db.one("SELECT remaining FROM slots WHERE id='S12'")["remaining"] == 0


# ---------- location ----------

def test_location_link_keeps_only_distance(client):
    tok = start(client)
    r = tool(client, "send_location_link", tok).json()
    assert r["sent"] is False  # no SMS provider configured in tests
    code = client.app.state.last_location_code
    assert "شارك موقعي" in client.get(f"/l/{code}").text
    lat, lon = 24.81234, 46.73456
    assert client.post(f"/l/{code}", json={"lat": lat, "lon": lon}).status_code == 200
    assert client.post(f"/l/{code}", json={"lat": lat, "lon": lon}).status_code == 404  # one use only
    sol = tool(client, "get_solutions", tok, reason="transport").json()
    assert sol["location_shared"] and sol["nearest_center_km"] is not None
    assert sol["options"][0]["mobile_clinic"]
    assert sol["extras"] and "ride" in sol["extras"][0]
    dump = "\n".join(client.app.state.db.conn.iterdump())
    assert "24.81234" not in dump and "46.73456" not in dump and code not in dump


def test_transport_after_booking(client):
    tok = start(client)
    assert tool(client, "request_transport", tok, mode="ride").status_code == 409  # nothing booked yet
    tool(client, "confirm_booking", tok, choice="held")
    assert tool(client, "request_transport", tok, mode="metro").json()["transport_status"] == "metro_plan_sent"


# ---------- strict inputs ----------

def test_reason_must_be_from_the_list(client):
    tok = start(client)
    bad = client.post("/tools/record_barrier", json={"conversation_id": tok, "reason": "my name is Noura and ..."}, headers=TOOL)
    assert bad.status_code == 422 and "Noura" not in text(bad)
    ok = client.post("/tools/record_barrier", json={"conversation_id": tok, "reason": "work_hours"}, headers=TOOL)
    assert ok.status_code == 200


def test_extra_fields_are_rejected(client):
    tok = start(client)
    r = client.post("/tools/get_appointment", json={"conversation_id": tok, "national_id": "1012345678"}, headers=TOOL)
    assert r.status_code == 422 and "1012345678" not in text(r)


# ---------- privacy of responses ----------

def test_no_pii_in_tool_or_admin_responses(client):
    r = client.post("/admin/calls", json={"case_id": "C01", "conversation_id": "conv_pii_check_01"}, headers=ADMIN)
    tok = "conv_pii_check_01"
    bodies = [text(r), text(client.get("/admin/due_queue", headers=ADMIN))]
    bodies.append(text(client.post("/tools/get_appointment", json={"conversation_id": tok}, headers=TOOL)))
    bodies.append(text(client.post("/tools/get_solutions", json={"conversation_id": tok, "reason": "other"}, headers=TOOL)))
    for b in bodies:
        for p in PHONES:
            assert p not in b and p[1:] not in b
        for word in ("diabetes", "hypertension", "R01", "C01"):
            assert word not in b or word == "C01" and '"case_id"' in b  # case ids appear only on staff routes


def test_phone_and_token_not_stored_in_plain_text(client):
    tok = start(client)
    db = client.app.state.db
    dump = "\n".join(db.conn.iterdump())
    assert tok not in dump
    for p in PHONES:
        assert p not in dump


# ---------- opt-out ----------

def test_opt_out_blocks_future_calls_and_releases_hold(client):
    tok = start(client, "C03")
    db = client.app.state.db
    slot = db.one("SELECT slot_id FROM holds")["slot_id"]
    before = db.one("SELECT remaining FROM slots WHERE id=?", slot)["remaining"]
    assert client.post("/tools/opt_out", json={"conversation_id": tok}, headers=TOOL).status_code == 200
    assert db.one("SELECT remaining FROM slots WHERE id=?", slot)["remaining"] == before + 1
    assert client.post("/admin/calls", json={"case_id": "C03"}, headers=ADMIN).status_code == 409


# ---------- webhook ----------

def sign(body: bytes, secret=WEBHOOK_SECRET, ts=None):
    ts = ts or int(time.time())
    mac = hmac.new(secret.encode(), f"{ts}.".encode() + body, hashlib.sha256).hexdigest()
    return f"t={ts},v0={mac}"


def test_webhook_requires_valid_signature_and_ends_call(client):
    tok = start(client)
    body = json.dumps({"type": "post_call_transcription", "data": {
        "conversation_id": tok,
        "transcript": [{"role": "user", "message": "رقم هويتي 1012345678"}]}}).encode()
    assert client.post("/webhooks/elevenlabs/post-call", content=body).status_code == 401
    assert client.post("/webhooks/elevenlabs/post-call", content=body,
                       headers={"ElevenLabs-Signature": sign(body, "wrong")}).status_code == 401
    old = sign(body, ts=int(time.time()) - 3600)
    assert client.post("/webhooks/elevenlabs/post-call", content=body, headers={"ElevenLabs-Signature": old}).status_code == 401
    ok = client.post("/webhooks/elevenlabs/post-call", content=body, headers={"ElevenLabs-Signature": sign(body)})
    assert ok.status_code == 200
    # transcript was not stored anywhere, and the token no longer works
    dump = "\n".join(client.app.state.db.conn.iterdump())
    assert "1012345678" not in dump
    assert client.post("/tools/get_appointment", json={"conversation_id": tok}, headers=TOOL).status_code == 403


# ---------- ministry ----------

def test_small_groups_are_suppressed(client):
    k = client.get("/ministry/kpis", headers=ADMIN).json()
    assert k["districts"] and all(d["suppressed"] for d in k["districts"])


def test_demo_claim_only_in_demo_mode(client, tmp_path):
    # Demo mode off (fixture): an unknown conversation cannot claim a session.
    client.post("/admin/calls", json={"case_id": "C01"}, headers=ADMIN)
    assert client.post("/tools/get_appointment", json={"conversation_id": "conv_web_test_1"}, headers=TOOL).status_code == 403
    # Demo mode on: the newest unbound session is claimed once, and a second conversation cannot take it.
    client.app.state.settings = client.app.state.settings.__class__(**{**client.app.state.settings.__dict__, "demo_mode": True})
    assert client.post("/tools/get_appointment", json={"conversation_id": "conv_web_test_1"}, headers=TOOL).status_code == 200
    assert client.post("/tools/get_appointment", json={"conversation_id": "conv_web_test_2"}, headers=TOOL).status_code == 403
