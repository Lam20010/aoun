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


def start(client, case="C01"):
    r = client.post("/admin/calls", json={"case_id": case}, headers=ADMIN)
    assert r.status_code == 200, r.text
    return r.json()["call_token"]


def text(resp):
    return resp.text


# ---------- access control ----------

def test_tools_reject_missing_or_wrong_key(client):
    tok = start(client)
    assert client.post("/tools/search_slots", json={"call_token": tok}).status_code == 401
    assert client.post("/tools/search_slots", json={"call_token": tok},
                       headers={"X-Aoun-Key": "wrong"}).status_code == 401


def test_admin_rejects_tool_key(client):
    assert client.post("/admin/calls", json={"case_id": "C01"}, headers={"X-Admin-Key": TOOL["X-Aoun-Key"]}).status_code == 401
    assert client.get("/ministry/kpis", headers={"X-Admin-Key": "nope"}).status_code == 401


def test_unknown_token_is_rejected(client):
    r = client.post("/tools/search_slots", json={"call_token": "ct_" + "x" * 40}, headers=TOOL)
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


# ---------- booking flow ----------

def test_search_then_confirm_and_replay(client):
    tok = start(client)
    opts = client.post("/tools/search_slots", json={"call_token": tok, "time_of_day": "evening"}, headers=TOOL).json()["options"]
    assert opts and all("offer_id" in o for o in opts)
    first = opts[0]["offer_id"]
    r1 = client.post("/tools/confirm_booking", json={"call_token": tok, "offer_id": first}, headers=TOOL)
    assert r1.status_code == 200 and r1.json()["status"] == "confirmed"
    r2 = client.post("/tools/confirm_booking", json={"call_token": tok, "offer_id": first}, headers=TOOL)
    assert r2.json()["booking_ref"] == r1.json()["booking_ref"] and r2.json()["replayed"]


def test_cannot_confirm_offer_from_another_call(client):
    t1 = start(client, "C01")
    offer = client.post("/tools/search_slots", json={"call_token": t1}, headers=TOOL).json()["options"][0]["offer_id"]
    t2 = start(client, "C02")
    r = client.post("/tools/confirm_booking", json={"call_token": t2, "offer_id": offer}, headers=TOOL)
    assert r.status_code == 409


def test_last_place_race_gives_one_booking(client):
    # Two separate calls for the same district/screening race for S02 (one place left).
    db = client.app.state.db
    with db.tx() as c:  # make C03 a Qurtubah diabetes case too, just for this race
        c.execute("UPDATE residents SET district='Qurtubah' WHERE id='R03'")
        c.execute("UPDATE cases SET screening='diabetes' WHERE id='C03'")
    toks = [start(client, "C01"), start(client, "C03")]
    offers = []
    for t in toks:
        opts = client.post("/tools/search_slots", json={"call_token": t, "time_of_day": "evening", "weekday": "sunday"},
                           headers=TOOL).json()["options"]
        assert opts[0]["start_local"].startswith("2026-11-29T19:00")
        offers.append(opts[0]["offer_id"])
    results = []

    def go(t, o):
        results.append(client.post("/tools/confirm_booking", json={"call_token": t, "offer_id": o}, headers=TOOL).status_code)

    threads = [threading.Thread(target=go, args=(t, o)) for t, o in zip(toks, offers)]
    [th.start() for th in threads]
    [th.join() for th in threads]
    assert sorted(results) == [200, 409]
    assert db.one("SELECT remaining FROM slots WHERE id='S02'")["remaining"] == 0


# ---------- strict inputs ----------

def test_reason_must_be_from_the_list(client):
    tok = start(client)
    bad = client.post("/tools/record_barrier", json={"call_token": tok, "reason": "my name is Noura and ..."}, headers=TOOL)
    assert bad.status_code == 422 and "Noura" not in text(bad)
    ok = client.post("/tools/record_barrier", json={"call_token": tok, "reason": "work_hours"}, headers=TOOL)
    assert ok.status_code == 200


def test_extra_fields_are_rejected(client):
    tok = start(client)
    r = client.post("/tools/search_slots", json={"call_token": tok, "national_id": "1012345678"}, headers=TOOL)
    assert r.status_code == 422 and "1012345678" not in text(r)


# ---------- privacy of responses ----------

def test_no_pii_in_tool_or_admin_responses(client):
    r = client.post("/admin/calls", json={"case_id": "C01"}, headers=ADMIN)
    tok = r.json()["call_token"]
    bodies = [text(r), text(client.get("/admin/due_queue", headers=ADMIN))]
    bodies.append(text(client.post("/tools/search_slots", json={"call_token": tok}, headers=TOOL)))
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

def test_opt_out_blocks_future_calls(client):
    tok = start(client, "C03")
    assert client.post("/tools/opt_out", json={"call_token": tok}, headers=TOOL).status_code == 200
    assert client.post("/admin/calls", json={"case_id": "C03"}, headers=ADMIN).status_code == 409


# ---------- webhook ----------

def sign(body: bytes, secret=WEBHOOK_SECRET, ts=None):
    ts = ts or int(time.time())
    mac = hmac.new(secret.encode(), f"{ts}.".encode() + body, hashlib.sha256).hexdigest()
    return f"t={ts},v0={mac}"


def test_webhook_requires_valid_signature_and_ends_call(client):
    tok = start(client)
    body = json.dumps({"type": "post_call_transcription", "data": {
        "conversation_initiation_client_data": {"dynamic_variables": {"call_token": tok}},
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
    assert client.post("/tools/search_slots", json={"call_token": tok}, headers=TOOL).status_code == 403


# ---------- ministry ----------

def test_small_groups_are_suppressed(client):
    k = client.get("/ministry/kpis", headers=ADMIN).json()
    assert k["districts"] and all(d["suppressed"] for d in k["districts"])
