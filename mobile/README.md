# عون — تطبيق الجوال

Native React Native app (Expo) with the same design as the prototype, and the live ElevenLabs agents:
the booking call (رُفيدة / رفيد) and the in-app assistant («يا رفيدة»).

## Structure

```
app/                     screens (expo-router: the file name is the route)
  incoming.tsx           Aoun's incoming call
  call.tsx               the call with the booking agent
  (tabs)/home.tsx        home: appointment card (time, center, doctor, clinic, trip), my care
  (tabs)/notebook.tsx    health notebook: screenings due/done, results and doctor notes, preferences
  (tabs)/meds.tsx        medicines and vitamins from the doctor, with reminders on the phone
  plan.tsx               the whole visit: doctor and clinic, map, Google Maps, Uber, metro, Darb, steps, change/cancel
  booking.tsx            open times by day and district, female-doctor filter, book or move
  record.tsx             health record from every hospital, clinic and lab; files; referrals; who opened it
  messages.tsx           private messages with the doctor
  family.tsx             family history (fixed codes), recommended screenings, warning signs
  map.tsx settings.tsx soon.tsx
src/
  agents/                one file per agent + index.ts (the registry)
  tools/                 client tools the agents can run on the phone
  voice/AgentSession.tsx one live agent at a time, shared by every screen
  api.ts                 the Aoun server (patient token, plan, booking, record, medicines, messages)
  notify.ts              local reminders: medicines at their times, the appointment the day before
  ui/PlanMap.tsx         Apple Maps on iPhone, Google Maps on Android (needs GOOGLE_MAPS_API_KEY)
  store.ts i18n.ts theme.ts data/ ui/
```

## Add a new agent

1. Create the agent in ElevenLabs (public, no secret key in the app).
2. Add `src/agents/<name>.ts`:
   ```ts
   export const nurseLine: AgentDef = {
     key: 'nurse-line',
     mode: 'call',                     // 'call' = call screen, 'assistant' = inside the app
     personas: { f: { name: 'رُفيدة', agentId: 'agent_…', avatar: require('../../assets/avatars/rufaida.png') },
                 m: { name: 'رفيد',  agentId: 'agent_…', avatar: require('../../assets/avatars/rafeed.png') } },
     clientTools: ['open_screen', 'read_screen'],   // any names from src/tools
     serverSession: false,             // true if it uses the server's webhook tools
   };
   ```
3. List it in `src/agents/index.ts`.
4. Start it from any screen: `useAgentSession().start('nurse-line')`.

A new client tool is one function in `src/tools/` (it receives the agent's parameters and can mute the mic,
end the session or hand over to another agent). Then add the same tool to the agent in ElevenLabs.

## Run it on a phone

The voice agents use native WebRTC, so the app needs a development build (Expo Go is not enough).
No Mac is needed: Expo builds it in the cloud.

```
cd mobile
npm install
npx eas-cli login
npx eas-cli device:create                                # iPhone only: register your phone
npx eas-cli build -p ios --profile development           # or: -p android
npx expo start --dev-client --tunnel                      # then open the installed app and scan the QR
```

- iPhone builds need an Apple Developer account. Android builds are free (`--profile preview` gives an APK).
- `npm run typecheck` checks the code.

## Languages

The app follows the language the person speaks (Arabic, English, Urdu, Hindi, Bengali, Filipino, Indonesian):
in a call or with the assistant it switches as soon as they speak another language, and the plan, booking text and
every screen follow. They can also pick it in settings. Arabic and Urdu read right to left.

## Maps and getting there

- iPhone: Apple Maps inside the app, no key needed.
- Android: set `GOOGLE_MAPS_API_KEY` when building (`app.config.js` adds it); without it the app shows a drawn map.
- Buttons open Google Maps directions (car, metro), Uber with the center already set as the drop-off, and the Darb app
  (Darb has no public link to a route, so it opens the store page).

## Screens from the presentation

- **Welcome**: the account comes ready from Sehhaty (masked ID and mobile), then Aoun calls.
- **Home**: «هلا يا …» over the neighbourhood scene, the visit card, a ride card, news from the Ministry for the district, and «رعايتي».
- **«حيّ عون»** (`app/game.tsx`): help neighbours, quick activities, coins, build and upgrade the district, daily tasks (one is real: confirming the visit). Kept on the server so it follows the person.
- **«وقت الإبرة؟»**: the same game in a 40-second calm mode.
- **«ممشى الحي»** (`app/walk.tsx`): the walkway route, a 30-minute walk timer, and this week's minutes (only minutes are saved).
- **«خطة الرعاية»** (`app/care.tsx`): from booking to result.
- **«شكل رفيدة»** (`app/avatar.tsx`): hair or hijab, ghutra or shemagh, beard, skin, expression, glasses and colours.
- **«أنا معك»** (`app/assistant.tsx`): everything the assistant can open; tap the assistant's face on the bar.

## Sehhaty and cost

The app shows the Sehhaty account (masked ID, insurance) in Settings, with a demo switcher between four profiles. Each slot and the plan show the cost: free through Sehhaty, or the private price, what insurance pays and what you pay. See the backend README for the rules.

## Privacy

- No API keys in the app.
- Nothing personal is sent to the agents.
- `read_screen` reads with the phone's own voice.
- Location is sent once to the Aoun server, which keeps only the distance.
- Only settings and the booked plan are saved on the phone. Calls are not saved.
- The phone keeps one random token for the person in secure storage; no name, ID or phone number is in the app.
- Reminders are local notifications; nothing goes to a push server.
- Report files open through a one-time link that works for 5 minutes.
