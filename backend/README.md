# Aoun voice tools (عون)

The backend that the call agents **Rafeed (رفيد)** and **Rufaida (رُفيدة)** use during a phone call.
Built for the agentX hackathon, Ministry of Health track. All data here is fictional.

## What it does

| Route | Who calls it | What it does |
|---|---|---|
| `POST /tools/get_appointment` | Voice agent | Reads the appointment held for this person when the call started |
| `POST /tools/confirm_booking` | Voice agent | Confirms the held appointment or a chosen alternative, once, in one transaction |
| `POST /tools/record_barrier` | Voice agent | Saves the refusal reason as a fixed code (11 reasons) |
| `POST /tools/send_location_link` | Voice agent | Texts a one-time link to share location (needs Twilio SMS settings) |
| `POST /tools/get_solutions` | Voice agent | Options that remove the reason: a trip, mobile clinic or home test, morning / evening / weekend, female doctor |
| `POST /tools/request_transport` | Voice agent | A car (alone / family / wheelchair, pickup time) or the metro; held until the booking is confirmed |
| `POST /tools/set_preferences` | Voice agent | Wheelchair-ready center, test at home, companion reminders, female doctor (fixed codes) |
| `POST /tools/request_nurse_callback` | Voice agent | Schedules a nurse to call back |
| `POST /tools/opt_out` | Voice agent | Stops all future contact |
| `POST /admin/calls` | Staff / planner | Opens a call session; places the phone call when `dry_run` is false |
| `GET /admin/due_queue` | Staff / planner | Contactable due cases, masked phones |
| `GET /ministry/kpis` | Ministry dashboard | District counts; groups under 50 are hidden |
| `POST /webhooks/elevenlabs/post-call` | ElevenLabs | Marks the call ended; everything else in the payload is discarded |
| `GET/POST /l/{code}` | Resident's phone | One-time location page; only the distance to the nearest center is kept |

## The call, step by step

1. "السلام عليكم، معك عون من وزارة الصحة. عساك بخير وصحة؟" The agent introduces itself.
2. Location first: "قبل ما أحجز لك، تسمح لي أشوف موقعك؟" (`send_location_link`), or the district registered in Sehhaty.
3. The nearest appointment (`get_appointment`): "يوم الخميس الساعة أربع ونص العصر، في مركز صحي النسيم القريب منك. يناسبك هالوقت؟"
4. Yes → step 5. "Why?" → a short explanation. No → "وش اللي مصعّبها عليك؟" → `record_barrier` (counted per district for the Ministry) + `get_solutions`:
   - no one to take them → a car (alone / family / wheelchair, pickup 30 or 60 minutes before) or the metro (`request_transport`, held until confirmed)
   - far → the mobile clinic by the mosque, or a test at home
   - the time → early morning, after Maghrib, or the weekend
   - afraid → reassurance; a female doctor is added
5. "Anything to make your day easier?" (`set_preferences`). The companion is added in the app; the agent never asks for names or numbers.
6. The plan is read back, "نأكّدها؟", and only after a clear yes: `confirm_booking`. Then goodbye.

## How privacy and security work

- **ElevenLabs never learns who it is talking to.** Each call is bound on the server to the ElevenLabs conversation id; nothing about the person is passed to the agent. The database stores only the id's SHA-256 hash.
- **The id comes from ElevenLabs, not the model.** Every tool sends `system__conversation_id`, which ElevenLabs fills in itself, so the language model never sees or changes it.
- **Only calls the server started work.** Real calls are bound when placed. In demo mode, a dashboard or web test conversation can claim the newest session staff opened in the last 15 minutes, once.
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
python -m pytest -q     # 22 security and flow tests
```

## Deploy on Render

1. On render.com: **New + → Blueprint** → pick this repository. `render.yaml` creates the service.
2. When asked, paste `AOUN_WEBHOOK_SECRET` (from the ElevenLabs post-call webhook). Leave the two ElevenLabs phone values empty until you have a phone number.
3. Copy the service URL (for example `https://aoun-voice-tools.onrender.com`) and the generated `AOUN_TOOL_KEY` and `AOUN_ADMIN_KEY` from the Environment tab.

**Before a demo:** the free plan sleeps after 15 minutes idle and the first request then takes about a minute, which is longer than a tool call waits. Open `/health` a minute before you start, or use a paid instance. The free plan also resets the SQLite file on every deploy, which is fine for demo data. For real data, hosting moves to a provider inside Saudi Arabia.

## Try a call from the ElevenLabs page

```bash
curl -X POST "$URL/admin/calls" -H "X-Admin-Key: $AOUN_ADMIN_KEY" \
     -H "content-type: application/json" -d '{"case_id":"C01"}'
```

Then, within 15 minutes, start a test conversation with Rafeed or Rufaida (needs `AOUN_DEMO_MODE=1`). That conversation is bound to case `C01`. Demo cases: `C01`, `C02`, `C03` can be called; `C04` declined contact; `C05` is not due.

## Try the prototype with the real agents (demo mode)

With `AOUN_DEMO_MODE=1`, open `/app` on the server (e.g. https://aoun-voice-tools.onrender.com/app) in
Chrome and allow the microphone:

- Tap **رد** on the incoming call: the real call agent (رُفيدة, or رفيد if the assistant voice is male)
  talks to you. When it asks for your location, the phone's prompt appears on the page; only the
  distance to the nearest center is kept. The booking you make shows on the plan card and the app.
- Open the **عون** app icon, sign in, allow the mic: the in-app assistant listens and can open screens,
  change the text size or language, show the plan on the map, read the notebook aloud on the phone,
  and start the booking call again.

The resident in this demo is invented. `tools/build_app.py` rebuilds `app/static/aoun-app.html` from the
exported prototype page and `tools/live.js`.
