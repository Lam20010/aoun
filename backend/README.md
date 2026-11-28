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
| `/patient/*` | The Aoun app | The person's plan, open times with doctor and clinic, booking and moving, health record from every facility, files, doctor notes, medicines, messages, family history, access log, language |
| `GET /f/{code}` | The Aoun app | One-time link (5 minutes) to open one report file |
| `GET /doctor` and `/doctor/api/*` | Screening doctor | Doctor portal: today's appointments, the patient's full record, add results, notes, files (PDF/PNG/JPEG, 5 MB), medicines and vitamins with times, messages, referrals |

## The app and the doctor portal

- **Booking with a doctor.** Every center has clinics and fictional doctors (`app/catalog.py`). Open times come from
  the screening's own times plus general center times for 21 days, each with a doctor and room. Booking or moving
  frees the old place in the same transaction. The call agent now says the doctor and clinic and the booking text
  (SMS, if Twilio is set) goes out in the language the person spoke (Arabic, English, Urdu, Hindi, Bengali, Filipino, Indonesian).
- **One record, many places.** Each person has past results and reports from different hospitals, clinics and labs
  (`app/history.py`, synthetic), kept with the person. Aoun results are added to the same record.
- **Who can see it.** A doctor sees a person only if that person has a confirmed or attended booking with them.
  Every opening and every change is written to an access log the person sees in the app.
- **Results.** The doctor enters values; the server works out normal / borderline / high from fixed ranges.
  **Genetic results are never stored** (sickle cell, thalassaemia, G6PD…): the server refuses them, and the doctor sends a
  genetic-counselling referral instead.
- **Medicines and vitamins.** Name, dose, times (HH:MM), days and food; the app schedules daily reminders on the phone.
- **Messages.** A private thread with the person's doctor.
- **Encrypted at rest.** Notes, messages, files, record titles and summaries, and medicine instructions use the same
  Fernet key as phone numbers. Patient and doctor tokens are stored only as SHA-256 hashes.
- **Doctor sign-in.** Each doctor signs in with their doctor ID (D01–D12) and password. Set each password as a PBKDF2 hash in
  `AOUN_DOCTOR_PASSWORDS` (JSON, e.g. `{"D03": "<hash>"}`; make a hash with
  `python -c 'from app.doctor import hash_password; print(hash_password("..."))'`). Doctors without their own hash use
  `AOUN_DOCTOR_CODE`; in demo mode that defaults to `aoun-demo-2026` and the page shows it. Five wrong tries lock an ID for 15 minutes.
- **Portal.** Arabic and English, a notifications panel (new bookings, patient messages, visits in the next 24 hours).
- **Messages in each reader's language.** With `ANTHROPIC_API_KEY` set on the server, a message written in another language
  is shown translated (doctor: Arabic or English; patient: their app language), with "show original". Translations stay in memory
  only. Without the key, messages show as written.

## One platform: the app, the doctor portal and the Ministry board

All three read and write the same server, so a change in one shows in the others:

| Happens in | Shows in |
|---|---|
| The person books, moves or cancels (app or call) | The doctor's list and notifications; the Ministry's district counts and live feed |
| The person tells Rufaida why they have not been screened | The Ministry's "why people don't get screened" chart for that district |
| The doctor enters a result or a referral | The person's record; the Ministry's results and early-detection counts |
| The person logs a walk in «ممشى الحي» | The doctor sees this week's minutes; the Ministry sees district minutes |
| The person helps a neighbour in «حيّ عون» | The Ministry feed (count only) |
| The Ministry approves a mobile clinic or evening hours | New open times in the app and in the call agents' options; doctors of that district get a notification |
| The Ministry approves transport support or a "healthy district" challenge | The agents mention it; the challenge shows on the person's home and in the game |

The Ministry only ever sees counts per district (`activity` table): no person, name, number or condition text.

- Board: `GET /ministry/board` (sign in with a staff ID and `AOUN_MINISTRY_PASSWORD`; in demo mode `aoun-ministry-2026`). Five wrong tries lock for 15 minutes.
- API: `POST /ministry/api/login`, `GET /ministry/api/live`, `GET /ministry/api/insights`, `POST /ministry/api/interventions`, `POST /ministry/api/interventions/{id}/approve`.
- The board page is built from the presentation design: `python board/build.py` (source `board/Ministry.dc.html` + `board/live.js`). The rest of the Kingdom on the map stays the board's simulation; the pilot districts in Riyadh add the live counts.

### صوت الأحياء: why people don't get screened, per district

The tab shows, for each neighbourhood, why people didn't get screened, what got them to book in the end, and what they asked for.

**What each call leaves behind.** Each call by Rufaida or Rafeed leaves only fixed codes, counted per district in `activity`. Nothing is linked to the person, and nothing they said is kept. The codes are:
- answered;
- the one reason they gave (`record_barrier`): transport, work_hours, far, fear, no_need, cost_concern, childcare, language, sooner, already_screened, call_later, mistrust and others;
- what they chose (`resolved`: reason → solution, such as after-work time, ride, mobile clinic, home visit, female doctor, private clinic or same time);
- preferences, ride type and call language;
- booked, opted out and nurse callback.

**What the Ministry board shows.** The board reads all this from `GET /ministry/api/insights?range=week|month|quarter|year` (staff sign-in required). It shows:
- city KPIs;
- the top reasons across Riyadh;
- the reason × district heatmap;
- "what worked" for each reason;
- one card per district, with its funnel, top three reasons, what people asked for, and a suggested intervention you can approve on the spot.

**Small groups are hidden.** Any count from 1 to 4 is returned as `null`, and the board shows it as "<5".

**Demo data.** In demo mode the server seeds 16 weeks of aggregated history for the eight pilot districts, so the board has something to show. It does this only when the table is empty.

## Integrations

- **Google Maps**: set `AOUN_GOOGLE_MAPS_KEY` (server only) and `/patient/route` returns the real route, time and steps (driving, walking, transit incl. the Riyadh Metro). Without it, a straight-line estimate marked `estimate`.
- **Uber**: opens the Uber app with the destination filled in (documented universal link). Booking a ride for someone needs Uber's business API agreement.
- **Careem, Apple Maps**: open with the destination. **Darb**: no public API; transit directions in Google Maps plus the Darb app for tickets.
- **Calendar**: `/patient/calendar/link` gives a one-time `.ics` link with reminders a day and two hours before.
- **Sehhaty**: `app/sehhaty.py` is the one place that talks to Sehhaty. `SimulatedSehhaty` today; a real connection needs an MOH agreement (and Nafath sign-in), then `AOUN_SEHHATY_MODE=live`.

## Sehhaty integration (simulated)

The demo assumes Aoun is linked to Sehhaty. Nothing here calls the real Sehhaty; it behaves the way the integration would:

- **Bookings live in Sehhaty.** Every confirmed booking gets a Sehhaty reference (`SH-` + 8 digits) shown in the plan and the doctor portal.
- **Identity and insurance come from Sehhaty.** The resident row holds the ID type (citizen / resident), only the last 4 digits of the ID, and the insurer, class and expiry. The agent is told never to ask for an ID or insurance; it only hears the cost.
- **Cost is part of the plan.** `catalog.quote()` decides:
  - Health centers, mobile clinics, home visits and video consultations → **free** (MOH primary care booked through Sehhaty).
  - Private clinics (C-NAKHEEL, C-SHIFA) → listed price; with insurance the patient pays the class copay (A 10% up to 50 SAR, B 20% up to 75, C 20% up to 100); without insurance the full price.
- **The agent adapts to Sehhaty's options** through `get_solutions`:
  - `sooner` → the earliest free slot plus the earliest private slot, with its price.
  - `work_hours` → evening/Friday free options first, then a late or Friday private slot.
  - fear / no need / embarrassment → offers a free video consultation first.
  - `cost_concern` → reminds that the visit is free at the health center.
- **Demo profiles** (`citizen`, `citizen_insured`, `resident_insured`, `resident_uninsured`) are switchable from the app settings or `PATCH /patient/sehhaty-profile` (demo mode only).

Insurer names, classes and private prices are invented for the demo.

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
