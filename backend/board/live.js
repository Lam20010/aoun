/* The Ministry board, live: sign-in, then the pilot districts in Riyadh read the real counts from the
   Aoun server every few seconds (bookings, call reasons, results, early findings, walks, neighbours
   helped). Interventions approved here go to the server and change what people can book.
   The rest of the Kingdom stays the board's simulation, and the page says so. */
const TOKEN_KEY = "aoun_min";
const tok = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; } };
const setTok = (t) => { try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch (e) {} };
const api = (path, opts) => fetch("/ministry/api" + path, Object.assign({}, opts, {
  headers: Object.assign({ "content-type": "application/json", authorization: "Bearer " + tok() }, (opts && opts.headers) || {}),
})).then((r) => { if (r.status === 401) { setTok(""); throw new Error("401"); } if (!r.ok) throw new Error(String(r.status)); return r.json(); });

const FEED_STYLE = {
  booked: ["#E5F3FC", "#1574AD", "M3 4h18v17H3zM16 2v4M8 2v4M3 10h18"],
  cancelled: ["#FFF6E0", "#7A4E00", "M3 4h18v17H3zM9 13l6 6M15 13l-6 6"],
  barrier: ["#FFF6E0", "#7A4E00", "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"],
  result: ["#E6EEF7", "#3D6D94", "M9 3h6v4H9zM5 5h14v16H5zM9 12h6M9 16h4"],
  early: ["#FDE7E2", "#8A2A1C", "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3"],
  referral: ["#FDE7E2", "#8A2A1C", "M5 12h14M13 6l6 6-6 6"],
  walk: ["#FFF3DC", "#7A4E00", "M13 4a1.5 1.5 0 1 0 0-.01M9 21l2-6 3 3v3M7 12l3-3 3 2 3 1"],
  helped: ["#E1EBF3", "#3D6D94", "M6 12h4M8 10v4M15 11h.01M18 13h.01M7 6h10a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4l-2-2H9l-2 2a4 4 0 0 1-4-4v-4a4 4 0 0 1 4-4z"],
  intervention: ["#E5F3FC", "#1574AD", "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"],
  contacted: ["#E5F3FC", "#1574AD", "M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM19 10v1a7 7 0 0 1-14 0v-1M12 18v3"],
};
const IV_STYLE = {
  mobile_clinic: ["#E4F0F5", "#1574AD", "M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4"],
  transport: ["#FFF1DC", "#B26A12", "M5 17h14M6 17l1.5-6h9L18 17M8 21a1 1 0 1 0 0-2M16 21a1 1 0 1 0 0-2"],
  evening_hours: ["#E9E9F7", "#3E3E8F", "M3 4h18v17H3zM16 2v4M8 2v4M3 10h18"],
  language: ["#E6EEF7", "#3D6D94", "M4 5h7M7.5 5v2c0 4-2 7-5 8M13 19l4-10 4 10M14.5 16h5"],
  challenge: ["#E5F3FC", "#1574AD", "M12 2l2.9 6.9L22 9.6l-5.5 4.8L18.2 22 12 18.3 5.8 22l1.7-7.6L2 9.6l7.1-.7z"],
};
const ago = (iso) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? "الآن" : m < 60 ? "قبل " + m + " د" : m < 1440 ? "قبل " + Math.round(m / 60) + " س" : "قبل " + Math.round(m / 1440) + " يوم";
};
const fmtN = (n) => Math.round(n).toLocaleString("en-US");

class AounMinistry extends Component {
  constructor(props) {
    super(props);
    this.state = Object.assign({}, this.state, { live: null, needLogin: !tok(), loginErr: "", loggingIn: false, busy: {} });
  }
  componentDidMount() {
    super.componentDidMount && super.componentDidMount();
    this.poll();
    this.pt = setInterval(() => this.poll(), 6000);
    this.ht = setInterval(() => { if (!this.state.heroT || Date.now() - this.state.heroT > 9000) this.setState({ hero: (this.state.hero || 0) + 1 }); }, 8000);
    document.addEventListener("keydown", (e) => { if (e.key === "Enter" && this.state.needLogin) this.login(); });
  }
  componentWillUnmount() { super.componentWillUnmount && super.componentWillUnmount(); clearInterval(this.pt); clearInterval(this.ht); }
  poll() {
    if (!tok()) return this.state.needLogin || this.setState({ needLogin: true });
    api("/live?range=" + (this.state.range || "year")).then((live) => { this._d = null; this.setState({ live, needLogin: false }); })
      .catch((e) => { if (e.message === "401") this.setState({ needLogin: true, live: null }); });
    this._n = (this._n || 0) + 1;
    if (this.state.tab === "calls" || !this.state.ins || this._n % 5 === 0)
      api("/insights?range=" + (this.state.range || "year")).then((ins) => this.setState({ ins })).catch(() => {});
  }
  login() {
    const id = (document.getElementById("min-id") || {}).value || "", pw = (document.getElementById("min-pw") || {}).value || "";
    if (!id || !pw) return this.setState({ loginErr: "اكتب رقم الموظف وكلمة المرور" });
    this.setState({ loggingIn: true, loginErr: "" });
    fetch("/ministry/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ staff_id: id.trim(), password: pw }) })
      .then((r) => r.json().then((j) => ({ ok: r.ok, status: r.status, j })))
      .then(({ ok, status, j }) => {
        if (!ok) return this.setState({ loggingIn: false, loginErr: status === 429 ? "محاولات كثيرة، جرّب بعد ربع ساعة" : "رقم الموظف أو كلمة المرور غير صحيحة" });
        setTok(j.token); this.setState({ loggingIn: false, needLogin: false, staff: j.staff_id }); this.poll();
      }).catch(() => this.setState({ loggingIn: false, loginErr: "تعذّر الاتصال بالخادم" }));
  }
  logout() { setTok(""); this.setState({ needLogin: true, live: null, ins: null }); }
  approveLive(id) {
    if (this.state.busy[id]) return;
    this.setState({ busy: Object.assign({}, this.state.busy, { [id]: true }) });
    api("/interventions/" + id + "/approve", { method: "POST" }).then(() => { this._n = 4; this.poll(); }).catch(() => {})
      .finally(() => this.setState({ busy: Object.assign({}, this.state.busy, { [id]: false }) }));
  }
  proposeLive(district, kind) {
    return api("/interventions", { method: "POST", body: JSON.stringify({ district, kind }) }).then((r) => {
      const iv = r.interventions.find((x) => x.district === district && x.kind === kind && x.status === "proposed");
      if (iv) this.approveLive(iv.id);
    });
  }

  /* The board's model, with the live counts added to the pilot districts in Riyadh. */
  data() {
    const d = super.data();
    const L = this.state && this.state.live;
    if (!L || d.__live === L) return d;
    d.__live = L;
    const byAr = {}; L.districts.forEach((x) => { byAr[x.ar] = x; });
    d.hoods.forEach((h) => {
      const x = h.city === "الرياض" ? byAr[h.name] : null;
      if (!x) return;
      if (!h.__base) h.__base = { screened: h.screened, added: h.added, early: h.early, barrier: h.barrier };
      const b = h.__base, extra = x.booked + x.results;
      h.screened = Math.min(h.elig, b.screened + extra); h.added = b.added + extra; h.early = b.early + x.early;
      h.late = h.elig - h.screened; h.pct = Math.round(h.screened / h.elig * 100);
      const top = Object.entries(x.barriers).sort((p, q) => q[1] - p[1])[0];
      h.barrier = top && top[1] >= 3 ? top[0] : b.barrier;
      h.live = x;
    });
    return d;
  }

  renderVals() {
    const v = super.renderVals(), s = this.state, L = s.live;
    v.login = { show: !!s.needLogin, err: s.loginErr, hasErr: !!s.loginErr, busy: s.loggingIn, label: s.loggingIn ? "جاري الدخول…" : "تسجيل الدخول",
      submit: () => this.login() };
    v.logout = () => this.logout();
    v.dataBadge = L ? "مباشر من التجربة · بقية المملكة محاكاة" : "بيانات تجريبية للعرض";
    v.dataBadgeBg = L ? "#E5F3FC" : "#FFF6E0";
    v.dataBadgeInk = L ? "#1574AD" : "#7A4E00";
    v.is = Object.assign({}, v.is, { calls: s.tab === "calls", agents: s.tab === "agents" });
    // Top bar tabs: the selected one is a filled blue block with a light bar under it.
    v.navTabs = (v.tabs || []).map((tb) => { const on = tb.current === "page";
      return Object.assign({}, tb, { bg: on ? "#1574AD" : "transparent", ink: on ? "#FFFFFF" : "#0E2E45", bar: on ? "#59C2F9" : "transparent", weight: on ? 700 : 500 }); });
    // Hero: three slides from live numbers, arrows work, it also moves on by itself.
    const I = s.ins, topR = I && I.reasons && I.reasons[0];
    const slides = [
      { kicker: "صوت الأحياء", title: topR ? "أكثر سبب يمنع سكان الرياض من الفحص المبكر: «" + topR.ar + "»" : "اعرف ليش الناس ما يفحصون في كل حي",
        text: "كل مكالمة من رفيدة ورفيد تترك رمز سبب واحد لحيّها، بدون اسم أو رقم. شوف الأسباب حي حي وش اللي نجح معها.", cta: "افتح صوت الأحياء", tab: "calls" },
      { kicker: "تدخلات بضغطة", title: "اعتمد عيادة متنقلة أو دعم مواصلات، وتصير مواعيد فعلية في تطبيق عون",
        text: "كل تدخل تعتمده يوصل للتطبيق ولرفيدة فورًا، ويبلغ الأطباء في الحي.", cta: "شوف التدخلات", tab: "actions" },
      { kicker: "مباشر", title: "رفيدة ورفيد يتصلون الآن بلهجة سعودية وبسبع لغات",
        text: "يسألون عن السبب، يحلّونه في نفس المكالمة، ويحجزون في صحتي.", cta: "أداء الوكلاء", tab: "agents" },
    ];
    const hi = ((s.hero || 0) % slides.length + slides.length) % slides.length, sl = slides[hi];
    v.hero = Object.assign({ show: v.is.home && !s.needLogin }, sl, {
      next: () => this.setState({ hero: hi + 1, heroT: Date.now() }), prev: () => this.setState({ hero: hi - 1 + slides.length, heroT: Date.now() }),
      go: () => this.setState({ tab: sl.tab }),
      dots: slides.map((_, j) => ({ w: j === hi ? "26px" : "8px", c: j === hi ? "#59C2F9" : "rgba(255,255,255,.35)" })) });
    v.a11y = { on: s.big ? "true" : "false", zoom: s.big ? 1.15 : 1, toggle: () => this.setState({ big: !s.big }) };
    v.ins = this.insightsVals();
    if (!L) { v.livePanel = { show: false }; return v; }

    v.liveCount = fmtN(1240 + (s.tick * 37) % 400 + L.calls_now);
    const ivAll = L.interventions, approved = ivAll.filter((x) => x.status === "approved");

    // Live feed first, then the board's own simulated lines.
    const liveFeed = L.feed.slice(0, 5).map((f, j) => {
      const st = FEED_STYLE[f.kind] || FEED_STYLE.booked;
      return { text: f.text_ar, bg: st[0], color: st[1], d: st[2], time: ago(f.at), cls: j === 0 ? "aoun-feed" : "" };
    });
    v.feed = liveFeed.concat(v.feed).slice(0, 5);

    // Active interventions: the approved ones from the server come first.
    const liveActive = approved.slice(0, 4).map((iv) => {
      const st = IV_STYLE[iv.kind] || IV_STYLE.challenge;
      const x = L.districts.find((d) => d.key === iv.district) || {};
      const status = iv.kind === "mobile_clinic" || iv.kind === "evening_hours" ? iv.slots + " موعد جديد · " + fmtN(x.booked || 0) + " حجز في الحي"
        : iv.kind === "transport" ? "مشاوير مجانية للمواعيد" : iv.kind === "challenge" ? "يظهر في تطبيق كل ساكن" : "رفيدة تتصل بلغتهم";
      return { title: iv.title_ar, where: "حي " + iv.district_ar + "، الرياض · اعتُمد " + ago(iv.approved_at), prog: Math.min(95, 20 + (x.booked || 0) * 8) + "%",
        status, bg: st[0], color: st[1], d: st[2] };
    });
    v.active = liveActive.concat(v.active).slice(0, 4);

    // KPI "active interventions"
    v.kpis = v.kpis.map((k) => k.label === "تدخلات نشطة" ? Object.assign({}, k, { value: String(parseInt(k.value, 10) + approved.length), sub: approved.length + " اعتمدتها عبر عون" }) : k);

    // A pilot district: real suggestions with a real "approve".
    const hoodName = s.hood, cityName = s.city;
    const pilot = cityName === "الرياض" && hoodName ? L.districts.find((d) => d.ar === hoodName) : null;
    if (pilot) {
      const mine = ivAll.filter((x) => x.district === pilot.key);
      const kinds = ["mobile_clinic", "evening_hours", "transport", "language", "challenge"];
      const LBL = { mobile_clinic: "يضيف ٩ مواعيد مجانية عند جامع الحي", evening_hours: "يضيف مواعيد ٨ و٩ بالليل لأسبوع", transport: "المشوار للموعد مجاني لسكان الحي",
        language: "رفيدة تتصل بالأوردو والهندية والبنغالية", challenge: "هدف جماعي يظهر في تطبيق السكان ولعبة حيّ عون" };
      const TITLE = { mobile_clinic: "عيادة متنقلة عند جامع الحي", evening_hours: "مواعيد مسائية", transport: "دعم المواصلات", language: "تواصل بلغات العمالة", challenge: "تحدي «حيّ صحي»" };
      const topBar = Object.entries(pilot.barriers).sort((p, q) => q[1] - p[1])[0];
      v.hoodRecs = kinds.map((k) => {
        const iv = mine.find((x) => x.kind === k && x.status === "approved") || mine.find((x) => x.kind === k);
        const done = !!(iv && iv.status === "approved"), st = IV_STYLE[k];
        return { title: TITLE[k], why: LBL[k] + (k === "mobile_clinic" && topBar ? ". أكثر سبب ذكره السكان لرفيدة: «" + topBar[0] + "»." : "."),
          impact: done ? (iv.slots ? "أُضيف " + iv.slots + " موعد للحجز" : "مفعّل الآن") : "يصل للتطبيق ورفيدة فور الاعتماد",
          d: st[2], bg: st[0], color: st[1], done, pending: !done,
          approve: () => (iv ? this.approveLive(iv.id) : this.proposeLive(pilot.key, k)) };
      });
      const bars = Object.entries(pilot.barriers).sort((p, q) => q[1] - p[1]).slice(0, 4);
      v.livePanel = { show: true, title: "مباشر من تجربة عون في حي " + pilot.ar,
        stats: [["حجوزات", pilot.booked], ["نتائج أدخلها الأطباء", pilot.results], ["اكتشاف مبكر", pilot.early], ["إحالات", pilot.referrals],
          ["دقائق مشي في ممشى الحي", pilot.walk_minutes], ["جيران ساعدوهم في حيّ عون", pilot.helped]].map(([k, n]) => ({ k, n: fmtN(n) })),
        bars: bars.map(([k, n]) => ({ k, n: fmtN(n) })), hasBars: bars.length > 0,
        note: "أعداد مجمّعة للحي فقط، بدون أي اسم أو رقم أو تشخيص. تتحدث كل ٦ ثوانٍ." };
    } else {
      v.livePanel = { show: false };
    }

    // The interventions table: approving a pilot district goes to the server.
    v.actionRows = (v.actionRows || []).map((r) => {
      const x = r.city === "الرياض" ? L.districts.find((d) => d.ar === r.name) : null;
      if (!x) return r;
      const mine = ivAll.filter((iv) => iv.district === x.key);
      const done = mine.some((iv) => iv.status === "approved"), first = mine.find((iv) => iv.status === "proposed");
      return Object.assign({}, r, { name: r.name + " · مباشر", done, pending: !done, approve: () => first && this.approveLive(first.id) });
    });
    return v;
  }

  /* «صوت الأحياء»: the reasons people gave on the calls, per district, and what fixed them. */
  insightsVals() {
    const I = this.state.ins;
    if (!I) return { loading: true, kpis: [], reasons: [], worked: [], cols: [], heat: [], heatCells: [], ncols: 1, cards: [], withReason: "—", note: "" };
    const n = (x) => (x === null || x === undefined ? "<5" : fmtN(x));
    const pct = (a, b) => (a && b ? Math.round(a * 100 / b) + "%" : "—");
    const c = I.city;
    const kpis = [["اتصال من رفيدة ورفيد", n(c.contacted)], ["ردّوا على المكالمة", pct(c.answered, c.contacted)],
      ["ذكروا سببًا", n(I.city_with_reason)], ["حجزوا", pct(c.booked, c.contacted)],
      ["نتائج وصلت من الأطباء", n(c.results)], ["طلبوا عدم الاتصال", n(c.opted_out)]].map(([k, v]) => ({ k, n: v }));
    const PAL = ["#1574AD", "#C98A1B", "#3E3E8F", "#3D6D94", "#B5523B", "#7A4E00", "#3BA6E0", "#8C6D3F", "#6A7883", "#A0446B"];
    const colorOf = {}; I.reasons.forEach((r, i) => { colorOf[r.code] = PAL[i % PAL.length]; });
    const maxR = Math.max(1, ...I.reasons.map((r) => r.n || 0));
    const reasons = I.reasons.slice(0, 8).map((r) => ({ ar: r.ar, n: n(r.n), w: Math.round((r.n || 2) * 100 / maxR) + "%", color: colorOf[r.code] }));
    const worked = I.worked.slice(0, 7).map((w) => ({ ar: w.ar, best: "الأنجح: " + w.best_ar + (w.solutions[1] ? " · ثم " + w.solutions[1].ar : ""), pct: w.best_pct + "%" }));
    const cols = I.reasons.slice(0, 7);
    const heat = I.districts.map((d) => {
      const tot = Object.values(d.barriers).reduce((a, x) => a + (x || 0), 0);
      return { ar: d.ar, cells: cols.map((col) => {
        const v = d.barriers[col.code];
        if (v === undefined || v === 0) return { t: "—", bg: "#F6F8F9", ink: "#99A4AC" };
        if (v === null) return { t: "<5", bg: "#F1F3F4", ink: "#7D8B96" };
        const p = tot ? v / tot : 0, a = Math.min(1, 0.12 + p * 2.2);
        return { t: Math.round(p * 100) + "%", bg: "rgba(21,116,173," + a.toFixed(2) + ")", ink: a > 0.5 ? "#FFFFFF" : "#0E2E45" };
      }) };
    });
    const RIDE = { car: "سيارة", metro: "مترو", car_wheelchair: "سيارة للكرسي المتحرك" };
    const L = I.labels || {};
    const cards = I.districts.map((d) => {
      const asks = [];
      const push = (obj, lbl, pre) => Object.entries(obj || {}).sort((a, b) => (b[1] || 0) - (a[1] || 0)).slice(0, 3)
        .forEach(([k, v]) => asks.push((pre || "") + (lbl[k] || k) + " · " + n(v)));
      push(d.prefs, L.prefs || {}); push(d.rides, RIDE, "مشوار "); push(Object.fromEntries(Object.entries(d.langs || {}).filter(([k]) => k !== "ar")), L.langs || {}, "لغة ");
      const sg = d.suggestion, busy = sg && sg.intervention_id && this.state.busy[sg.intervention_id];
      return { ar: d.ar, en: d.en,
        funnel: [["تواصلنا", n(d.contacted)], ["ردّوا", n(d.answered)], ["حجزوا", n(d.booked)], ["حُلّ عائقهم", n(d.solved)]].map(([k, v]) => ({ k, n: v })),
        top: d.top.slice(0, 3).map((t) => ({ ar: t.ar, pct: t.pct + "%", w: t.pct + "%", color: colorOf[t.code] || "#1574AD" })),
        asks: asks.slice(0, 6), hasAsks: asks.length > 0,
        hasSug: !!sg, sugTitle: sg ? sg.title_ar : "", sugWhy: sg ? "لأن أكثر سبب في الحي: «" + sg.because_ar + "». " + sg.detail_ar : "",
        sugPending: !!sg && sg.status !== "approved", sugDone: !!sg && sg.status === "approved", sugBtn: busy ? "جاري الاعتماد…" : "اعتماد",
        approve: () => sg && (sg.intervention_id ? this.approveLive(sg.intervention_id) : this.proposeLive(d.key, sg.kind)) };
    });
    const heatCells = [];
    heat.forEach((r) => { heatCells.push({ t: r.ar, bg: "transparent", ink: "#0E2E45", align: "right", weight: 700 });
      r.cells.forEach((c) => heatCells.push(Object.assign({ align: "center", weight: 600 }, c))); });
    return { loading: false, kpis, reasons, worked, cols, heat, heatCells, ncols: cols.length, cards, withReason: n(I.city_with_reason),
      note: "أعداد مجمّعة لكل حي من رموز ثابتة فقط، وأي خانة أقل من " + I.small_cell + " أشخاص تظهر «<5». آخر تحديث " + ago(I.updated_at) + "." };
  }

}
