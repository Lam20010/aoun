# Aoun voice tools (عون)

The backend that the call agents **Rafeed (رفيد)** and **Rufaida (رُفيدة)** use during a phone call.
Built for the agentX hackathon, Ministry of Health track. All data here is fictional.

## What it does

| Route | Who calls it | What it does |
|---|---|---|
| `POST /tools/get_appointment` | Voice agent | Reads the appointment held for this person when the call started |
| `POST /tools/confirm_booking` | Voice agent | Confirms the held appointment or a chosen alternative, once, in one transaction |
| `POST /tools/record_barrier` | Voice agent | Saves the refusal reason as a fixed code (10 reasons) |
| `POST /tools/send_location_link` | Voice agent | Texts a one-time link to share location (needs Twilio SMS settings) |
| `POST /tools/get_solutions` | Voice agent | Options that remove the reason: evening, mobile clinic, ride, female staff, companion, nurse |
| `POST /tools/request_transport` | Voice agent | A free ride or a Riyadh Metro plan for the booking |
| `POST /tools/request_nurse_callback` | Voice agent | Schedules a nurse to call back |
| `POST /tools/opt_out` | Voice agent | Stops all future contact |
| `POST /admin/calls` | Staff / planner | Opens a call session; places the phone call when `dry_run` is false |
| `GET /admin/due_queue` | Staff / planner | Contactable due cases, masked phones |
| `GET /ministry/kpis` | Ministry dashboard | District counts; groups under 50 are hidden |
| `POST /webhooks/elevenlabs/post-call` | ElevenLabs | Marks the call ended; everything else in the payload is discarded |
| `GET/POST /l/{code}` | Resident's phone | One-time location page; only the distance to the nearest center is kept |

## The call, step by step

1. Greeting, then "is now a good time?"
2. "We have held an appointment for you: <center, day, time>. Do you confirm?" (`get_appointment`)
3. Yes → `confirm_booking` with `held`. No → ask once why → `record_barrier`.
4. With consent, text a link to share location (`send_location_link`).
5. `get_solutions` for their reason: evening/weekend times, a mobile clinic near home with a free ride or metro plan, female staff, a companion slot, a nurse call, or simply "it is free".
6. Explain the plan, wait for a clear yes, then `confirm_booking` (+ `request_transport`).
7. Thank them and say goodbye. The reason is now counted for their district on the Ministry dashboard.

## How privacy and security work

- **ElevenLabs never learns who it is talking to.** Each call gets a random one-time `call_token`; that token is the only thing passed to the agent. The database stores only its SHA-256 hash.
- **The token comes from the conversation, not the model.** In ElevenLabs, `call_token` is set as a dynamic variable on every tool, so the language model never sees or changes it.
- **Two keys.** Tools need `X-Aoun-Key`; staff routes need a different `X-Admin-Key`. Both are compared in constant time.
- **Only the held appointment or options offered in this call can be booked.** Confirming twice returns the same booking; two calls racing for the last place give one booking and one "slot taken".
- **Fixed choices, not free text.** Refusal reasons, times and nurse topics are enums. Unknown fields are rejected, and error messages never echo what was sent.
- **Responses carry no names, IDs, phone numbers or conditions.** The screening type stays on the server.
- **Location is used once.** The link works once for 30 minutes; the server keeps only the distance to the nearest center and never stores or logs coordinates or the link code.
- **Phone numbers are encrypted at rest** and decrypted only to place a call. Everywhere else they are masked (`•••••105`).
- **No transcripts are stored.** The post-call webhook checks the HMAC signature and keeps only "this call ended".
- **Logs contain method, path and status only.** API docs are switched off.
- **Ministry sees aggregates only**, with any group under 50 hidden.

## Run locally

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in the values, then:
set -a; source .env; set +a
uvicorn app.main:create_app --factory --port 8000
python -m pytest -q     # 19 security and flow tests
```

## Deploy on Render

1. On render.com: **New + → Blueprint** → pick this repository. `render.yaml` creates the service.
2. When asked, paste `AOUN_WEBHOOK_SECRET` (from the ElevenLabs post-call webhook). Leave the two ElevenLabs phone values empty until you have a phone number.
3. Copy the service URL (for example `https://aoun-voice-tools.onrender.com`) and the generated `AOUN_TOOL_KEY` and `AOUN_ADMIN_KEY` from the Environment tab.

**Before a demo:** the free plan sleeps after 15 minutes idle and the first request then takes about a minute, which is longer than a tool call waits. Open `/health` a minute before you start, or use a paid instance. The free plan also resets the SQLite file on every deploy, which is fine for demo data. For real data, hosting moves to a provider inside Saudi Arabia.

## Try a call in the ElevenLabs dashboard

```bash
curl -X POST "$URL/admin/calls" -H "X-Admin-Key: $AOUN_ADMIN_KEY" \
     -H "content-type: application/json" -d '{"case_id":"C01"}'
```

Copy `call_token` from the reply into the agent's test dynamic variables, then talk to it. Demo cases: `C01`, `C02`, `C03` can be called; `C04` declined contact; `C05` is not due.
