
/* ===== Live agents (added for the demo server) =====
   The call and the in-app assistant talk to the real ElevenLabs agents. Nothing personal is sent:
   the call only gets the language, and the assistant reads the screen on the phone itself. */
;(function () {
  const P = Component.prototype;
  const CALL_AGENT = { f: 'agent_9701m8d18596fbv8ghbf9jk4we3c', m: 'agent_3801m8d1800xe1dbvm93n5dg3gay' };
  const APP_AGENT = { f: 'agent_1501m8ef5ggye2a9q13mtb0rvkzj', m: 'agent_5601m8ef72qze8yv81t5v27tfqe0' };
  const IDLE_MS = 120000;
  let sdkP = null;
  const sdk = () => {
    if (window.ElevenLabsClient) return Promise.resolve(window.ElevenLabsClient);
    if (!sdkP) sdkP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/app/assets/elevenlabs-client-1.35.0.js'; s.onload = () => res(window.ElevenLabsClient); s.onerror = () => { sdkP = null; rej(new Error('sdk')); }; document.head.appendChild(s); });
    return sdkP;
  };
  const post = (u, b) => fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.ok ? r.json() : Promise.reject(r.status));
  const get = (u) => fetch(u).then((r) => r.ok ? r.json() : Promise.reject(r.status));
  setTimeout(() => { sdk().catch(() => {}); }, 1500);

  const ORIG = { accept: P.accept, hang: P.hang, goHomeFromCall: P.goHomeFromCall, locAnswer: P.locAnswer, onHeard: P.onHeard, listenOn: P.listenOn, listenOff: P.listenOff, intent: P.intent, micAnswer: P.micAnswer, openApp: P.openApp, linkDone: P.linkDone, stopAll: P.stopAll };
  const PREF_AR = { wheelchair_center: 'مركز يدعم الكرسي المتحرك', female_doctor: 'طبيبة' };
  const whenKey = (iso) => {
    const d = iso.slice(5, 16);
    return d === '12-03T17:00' ? 'thu5' : d.startsWith('12-03') ? 'thu' : d.startsWith('12-06') ? 'sun' : d.startsWith('12-09') ? 'wed' : d.startsWith('12-05') ? 'sat' : 'thu';
  };

  P.liveNote = function (t) { this.setState({ toast: { user: '', reply: t } }); clearTimeout(this.toastT); this.toastT = setTimeout(() => this.setState({ toast: null }), 5000); };

  /* ---------- the call ---------- */
  P.accept = function () {
    this.stopAll(); this.seq++; this.listenOff();
    this.endAssistant();
    const voice = this.state.voice === 'm' ? 'm' : 'f';
    this.setState({ receipt: false, callSheet: false, callTyping: false, booking: null, hist: this.state.hist.concat([{ w: 'sys', t: 'مكالمة صوتية · ' + new Date().toLocaleTimeString('ar-SA', { hour: 'numeric', minute: '2-digit' }) }]), stage: 'call', lines: [], opts: [], sec: 0, showPlan: false, planIdx: -1, planAsk: false, alert: null, plan: { ...this.PLAN0 }, revealed: false, listen: 'on', speaking: false });
    this.secT = setInterval(() => this.setState({ sec: this.state.sec + 1 }), 1000);
    this.callOn = true; this.callEnded = false; this.locShown = false;
    const my = this.seq;
    Promise.all([sdk(), post('/demo/start', { voice, lang: this.state.lang })]).then(([EL, d]) => {
      if (my !== this.seq || !this.callOn) return;
      this.demoK = d.k;
      return EL.Conversation.startSession({
        agentId: CALL_AGENT[voice], connectionType: 'websocket',
        overrides: { agent: { language: this.state.lang } },
        onConnect: ({ conversationId }) => { post('/demo/bind', { k: d.k, conversation_id: conversationId }).catch(() => {}); },
        onMessage: (m) => this.callMsg(m),
        onModeChange: ({ mode }) => this.setState({ speaking: mode === 'speaking' }),
        onAgentToolResponse: (e) => this.callTool(e && e.tool_name),
        onDisconnect: () => this.callDone(),
        onError: (msg) => { console.warn('[call]', msg); },
      }).then((conv) => { if (my !== this.seq || !this.callOn) { conv.endSession(); return; } this.conv = conv; this.pollLoc(); });
    }).catch((e) => {
      console.warn('[call] could not start', e);
      this.setState({ lines: this.state.lines.concat([['a', e === 429 ? 'الخط مشغول شوي، جرّبي بعد دقيقة.' : 'ما قدرت أفتح المكالمة. تأكّدي من النت والمايك، وجرّبي مرة ثانية.']]) });
    });
  };
  P.callMsg = function (m) {
    const text = (m && m.message || '').trim(); if (!text) return;
    const who = (m.role || m.source) === 'user' ? 'u' : 'a';
    const st = { lines: this.state.lines.concat([[who, text]]), hist: this.state.hist.concat([{ w: who, t: text }]) };
    if (who === 'u' && !this.state.revealed) {
      const nm = this.state.voice === 'm' ? 'رفيد' : 'رفيدة';
      Object.assign(st, { revealed: true, chip: true, chipText: nm + ' معك' });
      clearTimeout(this.chipT); this.chipT = setTimeout(() => this.setState({ chip: false }), 4500);
    }
    this.setState(st);
    if (who === 'a' && /أقرأ لك الخطة|read you the plan|read the plan/i.test(text)) this.syncPlan(true);
  };
  P.callTool = function (name) {
    if (!name) return;
    if (/request_transport|set_preferences|get_solutions|get_appointment/.test(name)) this.syncPlan(false);
    if (name === 'confirm_booking') this.syncPlan(false, true);
  };
  P.syncPlan = function (show, afterConfirm) {
    const k = this.demoK; if (!k) return;
    get('/demo/plan?k=' + encodeURIComponent(k)).then((d) => {
      if (!d || !d.slot) return;
      const kind = d.slot.kind, p = { when: whenKey(d.slot.iso), place: kind === 'home_visit' ? 'home' : kind === 'mobile_clinic' ? 'mobile' : 'center', ride: '', rideAt: '4', prefs: [], companion: '' };
      if (d.ride) { p.ride = d.ride.mode === 'metro' ? 'metro' : ({ alone: 'car', group: 'fam', wheelchair: 'wheel' })[d.ride.party] || 'car'; p.rideAt = d.ride.pickup_minutes === 60 ? '330' : '4'; }
      (d.prefs || []).forEach((c) => { if (PREF_AR[c]) p.prefs.push(PREF_AR[c]); if (c === 'companion_reminders') p.companion = 'مرافق من العائلة'; if (c === 'home_test') { p.place = 'home'; p.ride = ''; } });
      if (d.ride && p.ride && p.place !== 'home') this.setState({ booking: { kind: p.ride === 'metro' ? 'darb' : 'uber', done: !!d.confirmed } });
      this.setPlan(p);
      if (show && !d.confirmed) this.setState({ showPlan: true, planIdx: -1, planAsk: false });
      if (d.confirmed && afterConfirm) { this.setPlan({ confirmed: true }); this.setState({ prog: 1, receipt: true, showPlan: false, booking: null, planAsk: false, opts: [] }); }
    }).catch(() => {});
  };
  P.pollLoc = function () {
    clearInterval(this.locT);
    this.locT = setInterval(() => {
      if (!this.callOn || !this.demoK) { clearInterval(this.locT); return; }
      get('/demo/status?k=' + encodeURIComponent(this.demoK)).then((d) => {
        if (d.location === 'asked' && !this.locShown && this.callOn) { this.locShown = true; this.setState({ alert: 'loc' }); }
      }).catch(() => {});
    }, 900);
  };
  P.locAnswer = function (allow) {
    if (!this.callOn) return ORIG.locAnswer.call(this, allow);
    this.setState({ alert: null, locAllowed: allow });
    const k = this.demoK; if (!k) return;
    const send = (lat, lon) => post('/demo/location', lat == null ? { k, allow } : { k, allow, lat, lon }).catch(() => {});
    if (!allow || !navigator.geolocation) return send();
    let sent = false; const once = (a, b) => { if (!sent) { sent = true; send(a, b); } };
    setTimeout(() => once(), 6000);
    try { navigator.geolocation.getCurrentPosition((p) => once(p.coords.latitude, p.coords.longitude), () => once(), { timeout: 5500, maximumAge: 600000 }); } catch (e) { once(); }
  };
  P.endCallSession = function () {
    this.callOn = false; clearInterval(this.locT);
    const c = this.conv; this.conv = null; if (c) { try { c.endSession(); } catch (e) {} }
  };
  P.callDone = function () {
    if (!this.callOn && this.callEnded) return;
    this.callEnded = true; const wasOn = this.callOn; this.endCallSession();
    if (!wasOn || this.state.stage !== 'call') return;
    setTimeout(() => { if (this.state.stage !== 'call') return; this.stopAll(); this.setState({ stage: 'home', receipt: false, callSheet: false, callTyping: false, showPlan: false, alert: null, speaking: false, notif: this.state.plan.confirmed ? 'booked' : 'later' }); }, this.state.receipt ? 2200 : 900);
  };
  P.hang = function () { this.callEnded = true; this.endCallSession(); return ORIG.hang.call(this); };
  P.goHomeFromCall = function () { this.callEnded = true; this.endCallSession(); return ORIG.goHomeFromCall.call(this); };
  P.decline = function () { this.endCallSession(); this.stopAll(); this.setState({ stage: 'home', notif: 'missed' }); };

  /* typing during the call or to the assistant goes to the live agent */
  P.onHeard = function (text) {
    if (this.state.stage === 'call' && this.conv) { this.conv.sendUserMessage(text); return; }
    return ORIG.onHeard.call(this, text);
  };

  /* the call's mic button mutes the real mic */
  P.listenOn = function () {
    if (this.state.stage === 'call') { if (this.conv) this.conv.setMicMuted(false); this.setState({ listen: 'on' }); return; }
    const g = this.state.game;
    if (this.state.stage === 'app' && !(g.open && g.task)) { this.startAssistant(); return; }
    return ORIG.listenOn.call(this);
  };
  P.listenOff = function () {
    if (this.state.stage === 'call') { if (this.conv) this.conv.setMicMuted(true); if (this.callOn) { this.setState({ listen: 'off' }); return; } }
    if (this.appConv || this.appStarting) { this.endAssistant(); this.setState({ listen: 'off' }); return; }
    return ORIG.listenOff.call(this);
  };

  /* ---------- the in-app assistant ---------- */
  P.startAssistant = function (firstText) {
    if (this.appConv) { if (firstText) this.appConv.sendUserMessage(firstText); this.bumpIdle(); return; }
    if (firstText) this.appQueue = (this.appQueue || []).concat([firstText]);
    if (this.appStarting) return;
    this.appStarting = true; this.setState({ listen: 'on', heard: '' });
    const voice = this.state.voice === 'm' ? 'm' : 'f';
    const say = (t) => { const h = this.state.hist.concat([{ w: 'a', t }]); const show = !this.state.siri; this.setState({ hist: h, toast: show ? { user: this.lastUser || '', reply: t } : this.state.toast }); if (show) { clearTimeout(this.toastT); this.toastT = setTimeout(() => this.setState({ toast: null }), 5200); } };
    const tools = {
      open_screen: ({ screen }) => {
        const go = {
          home: () => this.setState({ tab: 'home', scr: null, prof: false }), map: () => this.focusMap('plan'),
          notebook: () => this.setState({ tab: 'nb', scr: null, nbSeg: 0, prof: false }), results: () => this.setState({ tab: 'nb', scr: null, nbSeg: 1, prof: false }),
          preferences: () => this.setState({ tab: 'nb', scr: null, nbSeg: 2, prof: false }), family: () => this.setState({ scr: 'fam', prof: false }),
          settings: () => this.setState({ prof: true }), game: () => this.gameOpen('play'),
        }[screen];
        if (!go) return 'unknown screen';
        this.setState({ siri: false }); go(); this.bumpIdle(); return 'opened ' + screen;
      },
      read_screen: () => new Promise((res) => {
        const c = this.appConv; if (c) c.setMicMuted(true);
        if (this.state.tab !== 'nb' || this.state.scr) this.setState({ tab: 'nb', scr: null, nbSeg: this.state.nbSeg === 2 ? 0 : this.state.nbSeg, siri: false });
        setTimeout(async () => {
          const id = ++this.seq;
          const rows = this.state.nbSeg === 0 ? this.planRows().map((r) => ({ id: r.id, text: r.text || this.T(r.id) })) : this.nbRows().map((r) => ({ id: 'x', text: r.t + '، ' + r.s + '، ' + r.st }));
          for (let i = 0; i < rows.length && id === this.seq; i++) { this.setState({ nbHl: i }); await this.speakRaw(rows[i].id, rows[i].text); }
          this.setState({ nbHl: -1 }); if (this.appConv) this.appConv.setMicMuted(false); this.bumpIdle();
          res('done: the phone has read the screen aloud');
        }, 500);
      }),
      set_text_size: ({ size }) => { const f = this.state.fsz; this.setState({ fsz: size === 'bigger' ? Math.min(2, f + 1) : size === 'smaller' ? Math.max(0, f - 1) : 0 }); return 'done'; },
      set_app_language: ({ language }) => { if (['ar', 'en', 'ur'].indexOf(language) < 0) return 'unsupported'; this.setState({ lang: language }); return 'done'; },
      show_on_map: ({ target }) => { this.focusMap(target === 'walk' ? 'park' : 'plan'); return 'done'; },
      start_call: () => { setTimeout(() => { this.endAssistant(); this.stopAll(); this.setState({ stage: 'ring', notif: null, siri: false, toast: null }); }, 1200); },
    };
    sdk().then((EL) => EL.Conversation.startSession({
      agentId: APP_AGENT[voice], connectionType: 'websocket',
      overrides: { agent: { language: this.state.lang } }, clientTools: tools,
      onMessage: (m) => {
        const t = (m && m.message || '').trim(); if (!t) return; this.bumpIdle();
        if ((m.role || m.source) === 'user') { this.lastUser = t; this.setState({ heard: t, hist: this.state.hist.concat([{ w: 'u', t }]) }); }
        else say(t);
      },
      onModeChange: ({ mode }) => this.setState({ speaking: mode === 'speaking' }),
      onDisconnect: () => { this.appConv = null; this.appStarting = false; clearTimeout(this.idleT); if (this.state.stage === 'app') this.setState({ listen: 'off', speaking: false }); },
      onError: (msg) => console.warn('[assistant]', msg),
    })).then((conv) => {
      this.appStarting = false;
      if (this.state.stage !== 'app') { conv.endSession(); return; }
      this.appConv = conv; this.bumpIdle();
      (this.appQueue || []).forEach((t) => conv.sendUserMessage(t)); this.appQueue = [];
    }).catch((e) => { this.appStarting = false; console.warn('[assistant] could not start', e); this.setState({ listen: 'denied' }); });
  };
  P.bumpIdle = function () { clearTimeout(this.idleT); this.idleT = setTimeout(() => this.endAssistant(), IDLE_MS); };
  P.endAssistant = function () {
    clearTimeout(this.idleT); this.appQueue = [];
    const c = this.appConv; this.appConv = null; this.appStarting = false;
    if (c) { try { c.endSession(); } catch (e) {} }
  };
  P.intent = function (text, live) {
    if (this.state.stage === 'app' && !live) {
      this.lastUser = text;
      this.setState({ hist: this.state.hist.concat([{ w: 'u', t: text }]) });
      if (this.appConv) { this.appConv.sendUserMessage(text); this.bumpIdle(); } else this.startAssistant(text);
      return;
    }
    return ORIG.intent.call(this, text, live);
  };
  P.openApp = function () {
    this.stopAll(); const linked = this.state.linked;
    this.setState({ stage: linked ? 'app' : 'link', notif: null }, () => { if (linked && this.state.micAllowed) this.startAssistant(); });
  };
  P.linkDone = function () {
    this.setState({ linked: true, stage: 'app', alert: this.state.micAllowed ? null : 'mic' }, () => { if (this.state.micAllowed) this.startAssistant(); });
  };
  P.micAnswer = function (allow) {
    this.setState({ micAllowed: allow, alert: allow && !this.state.locAllowed ? 'loc2' : null });
    if (allow) this.startAssistant();
  };
  P.stopAll = function () {
    ORIG.stopAll.call(this);
    if (this.state.stage !== 'app' && this.state.stage !== 'link') this.endAssistant();
  };
  const cwu = P.componentWillUnmount;
  P.componentWillUnmount = function () { this.endCallSession(); this.endAssistant(); if (cwu) cwu.call(this); };
})();
