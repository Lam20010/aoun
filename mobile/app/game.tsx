// «حيّ عون» and «وقت الإبرة؟» (calm mode): the neighbourhood game from the presentation design.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, PanResponder, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import Svg, { Circle as SC, Ellipse, G, Line, Path, Polygon, Rect, Text as ST } from 'react-native-svg';
import { Icon, ICON } from '../src/ui/Icon';
import { Avatar } from '../src/ui/Avatar';
import { Row, Txt } from '../src/ui/kit';
import { C } from '../src/theme';
import { langInfo, useT } from '../src/i18n';
import { useApp } from '../src/store';
import { api, saveSoon } from '../src/api';
import { ACTS, BUILD, buildScene, daily, freshDay, Game, GAME0, H, ICON_COL, level, NPC, NPC_ORDER, SHOP, W } from '../src/data/game';
import type { DistrictNews } from '../src/types';

const today = () => new Date().toISOString().slice(0, 10);
const COIN = 'M12 6.5l1.7 3.5 3.8.4-2.9 2.6.9 3.8L12 14.8 8.5 16.8l.9-3.8-2.9-2.6 3.8-.4z';
const CALM_SECONDS = 40;

function Coin({ size = 18 }: { size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><SC cx="12" cy="12" r="10" fill="#E2D36B" stroke="#B8A93E" strokeWidth={1.5} /><Path d={COIN} fill="#FFFFFF" /></Svg>;
}
function IsoIcon({ k, c }: { k: string; c?: string[] }) {
  const col = c ?? ICON_COL[k] ?? ICON_COL.house;
  return (
    <Svg width={46} height={40} viewBox="0 0 52 42">
      <Polygon points="26,4 46,14 26,24 6,14" fill={col[0]} /><Polygon points="6,14 26,24 26,38 6,28" fill={col[1]} />
      <Polygon points="26,24 46,14 46,28 26,38" fill={col[2]} /><SC cx={26} cy={14} r={4} fill={col[3]} />
    </Svg>
  );
}

/** A token the person drags with a finger, inside an area measured in percent. */
function Drag({ x, y, onMove, onDrop, children }: { x: number; y: number; onMove: (x: number, y: number) => void; onDrop: (x: number, y: number) => void; children: React.ReactNode }) {
  const area = useRef({ w: 1, h: 1 });
  const start = useRef({ x, y });
  const pos = useRef({ x, y }); pos.current = { x, y };
  const pr = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { start.current = { ...pos.current }; },
    onPanResponderMove: (_, g) => onMove(Math.max(4, Math.min(96, start.current.x + g.dx / area.current.w * 100)), Math.max(6, Math.min(94, start.current.y + g.dy / area.current.h * 100))),
    onPanResponderRelease: () => onDrop(pos.current.x, pos.current.y),
  }), [onMove, onDrop]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={(e: LayoutChangeEvent) => { area.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }; }}>
      <View {...pr.panHandlers} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: [{ translateX: -24 }, { translateY: -24 }] }}>{children}</View>
    </View>
  );
}

/** One falling date: tap it before it lands. */
function Falling({ x, delay, dur, gone, onTake }: { x: string; delay: number; dur: number; gone: boolean; onTake: () => void }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: dur, delay, easing: Easing.linear, useNativeDriver: true }));
    loop.start(); return () => loop.stop();
  }, [v, delay, dur]);
  if (gone) return null;
  return (
    <Animated.View style={{ position: 'absolute', left: x as never, top: -40, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, 330] }) }] }}>
      <Pressable onPress={onTake} hitSlop={10} accessibilityRole="button">
        <Svg width={34} height={34} viewBox="0 0 24 24"><Path d="M12 4c4 0 6 4 6 9s-3 8-6 8-6-3-6-8 2-9 6-9z" fill="#8A5A2B" /><Path d="M12 4c0-1 1-2 2-2" stroke="#4B5512" strokeWidth={2} /></Svg>
      </Pressable>
    </Animated.View>
  );
}

export default function GameScreen() {
  const { lang } = useT();
  const L = lang === 'ar' ? 'ar' : 'en';
  const tx = (o: { ar: string; en: string }) => o[L];
  const T = (ar: string, en: string) => (L === 'ar' ? ar : en);
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const k = width / W;
  const voice = useApp((s) => s.voice);
  const plan = useApp((s) => s.plan);
  const stored = useApp((s) => s.game);
  const set = useApp((s) => s.set);
  const g: Game = freshDay(stored ?? GAME0(today()), today());
  const [calm, setCalm] = useState(modeParam === 'calm');
  useEffect(() => { setCalm(modeParam === 'calm'); }, [modeParam]);
  const [tab, setTab] = useState<'hood' | 'shop' | 'acts' | 'store'>('hood');
  const [msg, setMsg] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [task, setTask] = useState<string | null>(null);
  const [won, setWon] = useState(false);
  const [tok, setTok] = useState({ x: 9, y: 76 });
  const [fixed, setFixed] = useState<number[]>([]);
  const [act, setAct] = useState<{ id: string; hit: number[]; pos: [number, number][]; placed: boolean[]; holes: number[]; won: boolean } | null>(null);
  const [calmT, setCalmT] = useState(0);
  const [cheer, setCheer] = useState(false);
  const [news, setNews] = useState<DistrictNews | null>(null);
  const f = voice !== 'm';

  useEffect(() => { api.district().then(setNews).catch(() => {}); }, []);
  const say = useCallback((text: string) => { try { Speech.stop(); Speech.speak(text, { language: langInfo(lang).speech, rate: 0.95 }); } catch {} }, [lang]);
  useEffect(() => () => { try { Speech.stop(); } catch {} }, []);

  const update = useCallback((p: Partial<Game>, helped = 0) => {
    const cur = freshDay(useApp.getState().game ?? GAME0(today()), today());
    set({ game: { ...cur, ...p } });
    saveSoon({ game: true, helped });
  }, [set]);

  const openTask = useCallback((id: string) => { setTask(id); setWon(false); setTok({ x: 9, y: 76 }); setFixed([]); setAct(null); say(tx(NPC[id].ask)); }, [say]); // eslint-disable-line react-hooks/exhaustive-deps
  const startAct = useCallback((id: string) => {
    const st = { id, hit: [] as number[], pos: [] as [number, number][], placed: [] as boolean[], holes: [] as number[], won: false };
    if (id === 'boxes') { st.pos = [[15, 28], [22, 58], [12, 84]]; st.placed = [false, false, false]; }
    if (id === 'plant') { st.pos = [[25, 86], [50, 86], [75, 86]]; st.placed = [false, false, false]; st.holes = [-1, -1, -1]; }
    setAct(st); setTask(null); setMsg(tx(ACTS[id].how)); say(tx(ACTS[id].how));
  }, [say]); // eslint-disable-line react-hooks/exhaustive-deps

  const doCheer = useCallback(() => {
    setCheer(true); setTask(null); setAct(null);
    update({ pts: (useApp.getState().game?.pts ?? 300) + 150 });
    say(T('خلصنا! ساعدتِ جارنا، وأنتِ بعد كنتِ شجاعة اليوم.', 'All done! You helped a neighbour, and you were brave today.'));
  }, [update, say]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calm mode: start with the next neighbour (or an activity) and a 40-second timer.
  useEffect(() => {
    if (!calm) return;
    setCheer(false); setCalmT(0);
    const next = NPC_ORDER.find((x) => !g.done[x]);
    if (next) openTask(next); else startAct(['dates', 'plant', 'boxes', 'litter'].find((x) => !g.actsDone[x]) || 'dates');
    const i = setInterval(() => setCalmT((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [calm]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (calm && !cheer && calmT >= CALM_SECONDS) doCheer(); }, [calm, calmT, cheer, doCheer]);

  const winTask = () => {
    if (!task || won) return;
    const n = NPC[task]; setWon(true);
    update({ pts: g.pts + n.gain, done: { ...g.done, [task]: true } }, g.done[task] ? 0 : 1);
    say(tx(n.thanks));
    if (calm) setTimeout(doCheer, 1800);
  };
  const winAct = (a = act) => {
    if (!a || a.won) return;
    const A = ACTS[a.id]; setAct({ ...a, won: true });
    update({ pts: g.pts + A.gain, actsDone: { ...g.actsDone, [a.id]: true } });
    setMsg(tx(A.thanks)); say(tx(A.thanks));
    if (calm) setTimeout(doCheer, 1700);
  };
  const closeTask = () => { if (calm && !won) return doCheer(); setTask(null); setMsg(won ? T('ساعدتِ جارك! حيّك صار أحسن.', 'You helped your neighbour!') : msg); };
  const closeAct = () => { if (calm && !act?.won) return doCheer(); setAct(null); };

  const scene = useMemo(() => buildScene(g, L), [g, L]);
  const lvl = level(g);
  const healthDone = !!plan?.confirmed;
  const dl = daily(g, healthDone);
  const emptyPlots = ['plotA', 'plotB', 'plotC'].filter((p) => !g.plots[p] && (p !== 'plotC' || lvl >= 5));
  const challenge = news?.interventions.find((x) => x.kind === 'challenge');

  const cards = (() => {
    if (tab === 'shop') return SHOP.map(([key, t, cost]) => { const own = !!g.up[key];
      return { key, t: tx(t), cost: own ? '✓' : String(cost), coin: !own, done: own, icon: <IsoIcon k={key} />,
        pick: () => { if (own) return; if (g.pts < cost) return setMsg(T('تحتاجين عملات أكثر. ساعدي جارك وتكسبين.', 'You need more coins. Help a neighbour to earn some.'));
          update({ pts: g.pts - cost, up: { ...g.up, [key]: true } }); setMsg(T('حلو! حيّك صار أحلى وأسهل للجميع.', 'Lovely! Your district is nicer and easier for everyone.')); } }; });
    if (tab === 'acts') return Object.keys(ACTS).map((key) => { const A = ACTS[key];
      return { key, t: tx(A.t), cost: '+' + A.gain, coin: true, done: !!g.actsDone[key], icon: <IsoIcon k={key} c={[A.c, '#FFFFFF', '#E6EFEC', '#0F2E30']} />, pick: () => startAct(key) }; });
    if (tab === 'store') { const cnt = (x: string) => Object.values(g.plots).filter((v) => v === x).length;
      return ([['house', T('منازل', 'Houses'), cnt('house') + 1], ['park', T('حدائق', 'Parks'), cnt('park')], ['clinic', T('عيادات', 'Clinics'), cnt('clinic') + 1],
        ['pharmacy', T('صيدليات', 'Pharmacies'), cnt('pharmacy')], ['trees', T('جيران ساعدتيهم', 'Neighbours helped'), Object.keys(g.done).length]] as [string, string, number][])
        .map(([key, t, n]) => ({ key, t, cost: String(n), coin: false, done: false, icon: <IsoIcon k={key} />, pick: () => {} })); }
    return Object.keys(BUILD).map((key) => { const b = BUILD[key];
      return { key, t: tx(b.t), cost: String(b.cost), coin: true, done: false, dim: g.pts < b.cost, icon: <IsoIcon k={key} />,
        pick: () => { const target = sel || emptyPlots[0];
          if (!target) return setMsg(T('ما فيه أرض فاضية. ارفعي مستواك عشان تنفتح أرض جديدة.', 'No empty land. Level up to open more.'));
          if (g.pts < b.cost) return setMsg(T('تحتاجين عملات أكثر. ساعدي جارك وتكسبين.', 'You need more coins. Help a neighbour to earn some.'));
          update({ pts: g.pts - b.cost, plots: { ...g.plots, [target]: key } }); setSel(null); setMsg(T('حلو! بنيتي ', 'Nice! You built a ') + tx(b.t) + T('، وحيّك صار أجمل.', '.')); } }; });
  })();

  const bubble = calm && task ? tx(NPC[task].ask) : calm && act ? tx(ACTS[act.id].how)
    : msg || (challenge ? T(`تحدي «حيّ صحي» من الوزارة لحيّك: ${challenge.progress}/${challenge.goal}. كل موعد ومشي يحسب!`, `A "Healthy district" challenge from the Ministry: ${challenge.progress}/${challenge.goal}. Every booking and walk counts!`)
      : T(f ? 'هلا! ساعدي جيرانك، واجمعي العملات، ووسّعي حيّك.' : 'هلا! ساعد جيرانك، واجمع العملات، ووسّع حيّك.', 'Hi! Help your neighbours, collect coins and grow your district.'));
  // Tap instead of drag: put the next box in the van, or the next sapling in this hole.
  const placeNext = (hole: number) => {
    if (!act || act.won) return;
    const i = act.placed.findIndex((p) => !p); if (i < 0) return;
    const pos = act.pos.slice(), placed = act.placed.slice(), holes = act.holes.slice();
    if (act.id === 'boxes') { const n = placed.filter(Boolean).length; placed[i] = true; pos[i] = [66 + (n % 2) * 14, 40 + Math.floor(n / 2) * 14]; }
    else { if (hole < 0 || holes[hole] >= 0) return; holes[hole] = i; placed[i] = true; pos[i] = [[25, 55, 80][hole], [32, 22, 42][hole] - 6]; }
    const nx = { ...act, pos, placed, holes }; setAct(nx);
    if (placed.filter(Boolean).length >= ACTS[act.id].need) setTimeout(() => winAct(nx), 250);
  };
  const N = task ? NPC[task] : null;
  const A = act ? ACTS[act.id] : null;
  const pct = (v: number) => (v * k);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#96D7C6', '#D5EFE8', '#F6F0C4', '#EADFAE']} locations={[0, 0.3, 0.52, 1]} style={StyleSheet.absoluteFill} />
      <Svg width={width} height={H * k} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', top: 0, left: 0 }}>
        <G opacity={0.55}><Ellipse cx={70} cy={120} rx={34} ry={10} fill="#FFFFFF" /><Ellipse cx={300} cy={200} rx={40} ry={11} fill="#FFFFFF" /><Ellipse cx={200} cy={250} rx={28} ry={8} fill="#FFFFFF" /></G>
        <G fill="#B9D6CC" opacity={0.7}><Rect x={10} y={300} width={40} height={40} rx={3} /><Rect x={54} y={290} width={30} height={50} rx={3} /><Rect x={300} y={285} width={34} height={55} rx={3} /><Rect x={338} y={300} width={46} height={40} rx={3} /><Rect x={250} y={305} width={44} height={35} rx={3} /></G>
        {scene.polys.map((p, i) => <Polygon key={'p' + i} points={p.p} fill={p.f} stroke={p.s} strokeWidth={p.w} strokeDasharray={p.dash || undefined} strokeLinejoin="round" />)}
        {scene.lines.map((l, i) => <Line key={'l' + i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.c} strokeWidth={l.w} strokeDasharray={l.dash || undefined} strokeLinecap="round" />)}
        {scene.circles.map((c, i) => <SC key={'c' + i} cx={c.x} cy={c.y} r={c.r} fill={c.f} />)}
        {scene.texts.map((t, i) => <ST key={'t' + i} x={t.x} y={t.y} textAnchor="middle" fontSize={t.fs} fontWeight="800" fill={t.c}>{t.t}</ST>)}
      </Svg>

      {!calm && scene.plots.map((p) => (
        <Pressable key={p.key} onPress={() => { setSel(p.key); setTab('hood'); setMsg(T('اختاري من تحت وش تبنين هنا.', 'Pick below what to build here.')); }} accessibilityLabel={T('أرض فاضية للبناء', 'Empty land to build on')}
          style={[s.plot, { left: pct(p.x) - 20, top: pct(p.y) - 20, backgroundColor: sel === p.key ? '#E2D36B' : '#FFFFFF' }]}><Txt size={22} weight="700" center>+</Txt></Pressable>
      ))}
      {!calm && scene.locks.map((p, i) => (
        <View key={i} style={{ position: 'absolute', left: pct(p.x) - 40, top: pct(p.y) - 18, width: 80, alignItems: 'center' }} pointerEvents="none">
          <Icon d={ICON.lock} size={20} color="#3A5658" /><Txt size={10} weight="800" color="#3A5658" center>{T('يُفتح عند المستوى 5', 'Opens at level 5')}</Txt>
        </View>
      ))}
      {!calm && scene.coins.map((c) => (
        <Pressable key={c.key} onPress={() => { update({ coinsTaken: g.coinsTaken.concat([c.key]), collected: g.collected + 1, pts: g.pts + 20 }); setMsg(T('ممتاز! اجمعي عملات أكثر، ووسّعي حيّك.', 'Great! Collect more and grow your district.')); }}
          accessibilityLabel={T('اجمعي العملات', 'Collect coins')} style={[s.coin, { left: pct(c.x) - 20, top: pct(c.y) - 40 }]}><Coin size={26} /></Pressable>
      ))}
      {!calm && scene.npcs.map((n) => { const d = !!g.done[n.key], P = NPC[n.key];
        return (
          <Pressable key={n.key} onPress={() => openTask(n.key)} accessibilityLabel={tx(P.name)} style={{ position: 'absolute', left: pct(n.x) - 30, top: pct(n.y) - 38, alignItems: 'center', width: 60 }}>
            <Row gap={4} style={s.npc}><View style={[s.npcI, { backgroundColor: P.c }]}><Txt size={12} weight="800" center>{P.i}</Txt></View>
              <View style={[s.badge, { backgroundColor: d ? '#BAC94A' : '#E2D36B' }]}><Txt size={10} weight="800" center>{d ? '✓' : '!'}</Txt></View></Row>
            <View style={s.tip} />
          </Pressable>
        ); })}

      {/* top bar */}
      <View style={[s.top, { top: insets.top + 8 }]}>
        <Row gap={8}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} style={s.round} accessibilityRole="button" accessibilityLabel={T('رجوع', 'Back')}>
            <Icon d={L === 'ar' ? 'M5 12h14M13 6l6 6-6 6' : ICON.arrowLeft} size={20} width={2.4} />
          </Pressable>
          <Row gap={6} style={s.chip}><Icon d={ICON.game} size={18} color={C.teal} /><Txt size={17} weight="800" color="#3F8C8C">{calm ? T('وضع التشتيت', 'Calm mode') : T('حيّ عون', 'Aoun district')}</Txt></Row>
          <View style={{ flex: 1 }} />
          <Row gap={6} style={s.chipS}><Coin /><Txt size={15} weight="800">{g.pts.toLocaleString('en-US')}</Txt></Row>
          <View style={s.chipS}><Txt size={13} weight="800">{T('المستوى ', 'Level ') + lvl}</Txt></View>
        </Row>
        <Row gap={8} style={{ marginTop: 10 }}>
          <View style={s.face}><Avatar size={56} /></View>
          <View style={s.bubble}><Txt size={13} weight="800" color="#3F8C8C">{T(f ? 'رفيدة' : 'رفيد', f ? 'Rufaida' : 'Rafeed')}</Txt><Txt size={14}>{bubble}</Txt></View>
        </Row>
        {calm && !cheer && (
          <View style={{ marginTop: 10, gap: 4 }}>
            <View style={s.track}><View style={[s.fill, { width: `${Math.min(100, calmT / CALM_SECONDS * 100)}%` }]} /></View>
            <Txt size={12} weight="700" color={C.inkSoft} center>{T('وضع التشتيت · ركّزي مع جارك، لحظات وتخلص', 'Calm mode · focus on your neighbour, it will be over soon')}</Txt>
          </View>
        )}
        {!calm && (
          <Pressable onPress={() => setTasksOpen((o) => !o)} style={[s.chipS, { alignSelf: 'flex-start', marginTop: 10 }]}>
            <Row gap={6}><Icon d={ICON.calendar} size={16} /><Txt size={13} weight="700">{T('مهام اليوم', 'Today\'s tasks')} · {dl.filter((d) => d.v >= d.max).length}/{dl.length}</Txt></Row>
          </Pressable>
        )}
        {!calm && tasksOpen && (
          <View style={s.tasks}>
            {dl.map((d) => { const full = d.v >= d.max, cl = !!g.claimed[d.k];
              return (
                <Pressable key={d.k} disabled={cl || !full} onPress={() => { update({ pts: g.pts + d.rw, claimed: { ...g.claimed, [d.k]: true } }); setMsg(T('أحسنتِ! خذي ', 'Well done! Take ') + d.rw + T(' عملة.', ' coins.')); }}>
                  <Row gap={8} style={{ paddingVertical: 6 }}>
                    <View style={{ flex: 1 }}><Txt size={13} weight="700">{tx(d.t)}</Txt>
                      <View style={[s.track, { height: 6, marginTop: 4 }]}><View style={[s.fill, { width: `${d.v / d.max * 100}%` }]} /></View></View>
                    <Txt size={12} color={C.muted}>{d.v}/{d.max}</Txt>
                    <View style={[s.reward, { backgroundColor: cl ? '#EEF2D2' : full ? '#E2D36B' : '#F6F0C4' }]}><Txt size={12} weight="800">{cl ? '✓' : '+' + d.rw}</Txt></View>
                  </Row>
                </Pressable>
              ); })}
          </View>
        )}
      </View>

      {/* bottom: build, shop, activities, store */}
      {!calm && (
        <View style={[s.bottom, { paddingBottom: insets.bottom + 8 }]}>
          <Txt size={15} weight="800" style={{ paddingHorizontal: 14 }}>{{ hood: T('ابني في حيّك', 'Build in your district'), shop: T('المتجر · طوّري حيّك', 'Shop · improve your district'), acts: T('أنشطة سريعة', 'Quick activities'), store: T('المخزن', 'Inventory') }[tab]}</Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
            {cards.map((c) => (
              <Pressable key={c.key} onPress={c.pick} style={[s.card, { opacity: (c as { dim?: boolean }).dim ? 0.55 : 1, backgroundColor: c.done ? '#EEF2D2' : '#FFFFFF', borderColor: c.done ? '#BAC94A' : sel && tab === 'hood' ? '#E2D36B' : '#E6EFEC' }]}>
                {c.icon}<Txt size={12} weight="700" center lines={2}>{c.t}</Txt>
                <Row gap={3} style={{ justifyContent: 'center' }}>{c.coin && <Coin size={13} />}<Txt size={12} weight="800">{c.cost}</Txt></Row>
              </Pressable>
            ))}
          </ScrollView>
          <Row gap={4} style={s.tabs}>
            {([['hood', T('الحي', 'District'), ICON.home], ['shop', T('المتجر', 'Shop'), 'M4 9l1-5h14l1 5M4 9h16v11H4z'], ['acts', T('أنشطة', 'Activities'), ICON.game], ['store', T('المخزن', 'Store'), 'M3 8l9-5 9 5v10l-9 5-9-5zM3 8l9 5 9-5M12 13v10']] as const).map(([key, label, d]) => (
              <Pressable key={key} onPress={() => setTab(key)} style={[s.tab, tab === key && { backgroundColor: C.mint }]}>
                <Icon d={d} size={18} /><Txt size={11} weight="700" center>{label}</Txt>
              </Pressable>
            ))}
          </Row>
        </View>
      )}

      {/* a neighbour asks for help */}
      {N && (
        <View style={[s.sheet, { paddingBottom: insets.bottom + 14 }]}>
          <Row gap={10}><View style={[s.npcI, { width: 36, height: 36, borderRadius: 18, backgroundColor: N.c }]}><Txt size={15} weight="800" center>{N.i}</Txt></View>
            <View style={{ flex: 1 }}><Txt size={16} weight="800">{tx(N.name)}</Txt><Txt size={13} color={C.inkSoft}>«{tx(N.ask)}»</Txt></View></Row>
          {!won && <Txt size={13} weight="700" color={C.teal}>{tx(N.how)}</Txt>}
          <View style={s.area}>
            {N.type === 'drag' && !won && (
              <>
                <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
                  <Path d="M9 76 C 30 76, 40 50, 60 45 S 85 30, 91 24" stroke="#FFFFFF" strokeWidth={9} fill="none" strokeLinecap="round" />
                  <Path d="M9 76 C 30 76, 40 50, 60 45 S 85 30, 91 24" stroke="#E2D36B" strokeWidth={1.2} fill="none" strokeDasharray="3 3" />
                </Svg>
                <Pressable onPress={() => { setTok({ x: 91, y: 24 }); setTimeout(winTask, 300); }} accessibilityRole="button" accessibilityLabel={N.goal ? tx(N.goal) : ''}
                  style={[s.goal, { left: '91%', top: '24%' }]}><Icon d={ICON.plus} size={18} color={C.teal} /><Txt size={10} weight="800">{N.goal ? tx(N.goal) : ''}</Txt></Pressable>
                <Drag x={tok.x} y={tok.y} onMove={(x, y) => setTok({ x, y })} onDrop={(x, y) => { if (Math.hypot(x - 91, y - 24) < 13) winTask(); }}>
                  <View style={[s.npcI, { width: 48, height: 48, borderRadius: 24, backgroundColor: N.c, borderWidth: 3, borderColor: '#FFF' }]}><Txt size={18} weight="800" center>{N.i}</Txt></View>
                </Drag>
              </>
            )}
            {N.type === 'tap' && !won && [[22, 52], [50, 52], [78, 52]].map(([x, y], i) => { const fx = fixed.includes(i);
              return (
                <Pressable key={i} onPress={() => { if (fx) return; const nf = fixed.concat([i]); setFixed(nf); if (nf.length >= 3) setTimeout(winTask, 250); }}
                  style={[s.hole, { left: `${x}%`, top: `${y}%`, backgroundColor: fx ? '#BAC94A' : '#E2D36B' }]} accessibilityLabel={fx ? T('تم التصليح', 'Fixed') : T('صلّحي الحفرة', 'Fix the pothole')}>
                  <Txt size={12} weight="800" center>{fx ? '✓' : T('حفرة', 'Hole')}</Txt>
                </Pressable>
              ); })}
            {N.type === 'voice' && !won && (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <Txt size={15} weight="700" center>{N.phrase ? tx(N.phrase) : ''}</Txt>
                <Pressable onPress={winTask} style={[s.round, { width: 64, height: 64, borderRadius: 32, backgroundColor: C.mint }]} accessibilityLabel={T('قلتها', 'I said it')}><Icon d={ICON.mic} size={26} /></Pressable>
                <Txt size={12} color={C.muted}>{T('اضغطي بعد ما تقولينها', 'Tap after you say it')}</Txt>
              </View>
            )}
            {won && <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 }}><Txt size={18} weight="800" center>{tx(N.thanks)}</Txt><Row gap={4}><Coin /><Txt size={15} weight="800">+{N.gain}</Txt></Row></View>}
          </View>
          <Pressable onPress={closeTask} style={[s.btn, { backgroundColor: won ? '#BAC94A' : '#D5EFE8' }]}><Txt size={15} weight="800" center>{won ? (calm ? T('يلا', 'Next') : T('تم', 'Done')) : calm ? T('خلّصت', 'Finished') : T('بعدين', 'Later')}</Txt></Pressable>
        </View>
      )}

      {/* a quick activity */}
      {act && A && (
        <View style={[s.sheet, { paddingBottom: insets.bottom + 14 }]}>
          <Row style={{ justifyContent: 'space-between' }}><Txt size={16} weight="800">{tx(A.t)}</Txt>
            <Txt size={14} weight="800" color={C.teal}>{(A.type === 'move' ? act.placed.filter(Boolean).length : act.hit.length) + '/' + A.need}</Txt></Row>
          {!act.won && <Txt size={13} color={C.inkSoft}>{tx(A.how)}</Txt>}
          <View style={[s.area, { backgroundColor: A.type === 'tap' ? '#DDE6A8' : '#EFE7CC', overflow: 'hidden' }]}>
            {A.type === 'fall' && !act.won && Array.from({ length: 12 }, (_, i) => (
              <Falling key={i} x={`${8 + ((i * 37) % 84)}%`} delay={(i * 550) % 5000} dur={3600 + (i % 4) * 700} gone={act.hit.includes(i)}
                onTake={() => { const hit = act.hit.concat([i]); const nx = { ...act, hit }; setAct(nx); if (hit.length >= A.need) setTimeout(() => winAct(nx), 200); }} />
            ))}
            {A.type === 'tap' && !act.won && [[30, 20], [70, 28], [45, 45], [85, 55], [25, 62], [60, 75], [88, 88]].map(([x, y], i) => act.hit.includes(i) ? null : (
              <Pressable key={i} onPress={() => { const hit = act.hit.concat([i]); const nx = { ...act, hit }; setAct(nx); if (hit.length >= A.need) setTimeout(() => winAct(nx), 200); }}
                style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: [{ translateX: -18 }, { translateY: -18 }] }} hitSlop={8}>
                <Svg width={36} height={36} viewBox="0 0 24 24"><Path d={['M8 4 h8 v16 h-8 z', 'M5 7 L12 4 L19 8 L17 17 L9 20 L4 14 Z', 'M10 3 h4 v4 l2 3 v11 h-8 V10 l2-3 z'][i % 3]} fill={['#6C8CBF', '#FFFFFF', '#96D7C6'][i % 3]} stroke="#173F42" strokeWidth={1} /></Svg>
              </Pressable>
            ))}
            {A.type === 'move' && !act.won && (
              <>
                {act.id === 'boxes'
                  ? <Pressable onPress={() => placeNext(-1)} accessibilityRole="button" style={[s.target, { left: '75%', top: '47%', width: 104, height: 96, borderRadius: 12 }]}><Svg width={90} height={60} viewBox="0 0 120 80"><Rect x={4} y={10} width={80} height={50} fill="#6C8CBF" /><Rect x={84} y={26} width={30} height={34} fill="#6C8CBF" /><SC cx={24} cy={66} r={10} fill="#173F42" /><SC cx={96} cy={66} r={10} fill="#173F42" /></Svg></Pressable>
                  : [[25, 32], [55, 22], [80, 42]].map(([x, y], h) => <Pressable key={h} onPress={() => placeNext(h)} accessibilityRole="button" style={[s.target, { left: `${x}%`, top: `${y}%`, width: 56, height: 40, borderRadius: 28, transform: [{ translateX: -28 }, { translateY: -20 }], borderColor: act.holes[h] >= 0 ? '#BAC94A' : '#7A5434', backgroundColor: 'rgba(122,84,52,.22)' }]} />)}
                {act.pos.map(([x, y], i) => act.placed[i] ? (
                  <View key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: [{ translateX: -20 }, { translateY: -20 }] }}><IsoIcon k={act.id === 'boxes' ? 'house' : 'park'} c={act.id === 'boxes' ? ['#F3E3B5', '#E2D3A0', '#CDB98A', '#CDB98A'] : ['#BAC94A', '#7A5434', '#7A5434', '#BAC94A']} /></View>
                ) : (
                  <Drag key={i} x={x} y={y} onMove={(nx, ny) => { const pos = act.pos.slice(); pos[i] = [nx, ny]; setAct({ ...act, pos }); }}
                    onDrop={(nx, ny) => {
                      const pos = act.pos.slice(), placed = act.placed.slice(), holes = act.holes.slice();
                      if (act.id === 'boxes') { if (Math.abs(nx - 75) < 17 && Math.abs(ny - 47) < 17) { const n = placed.filter(Boolean).length; placed[i] = true; pos[i] = [66 + (n % 2) * 14, 40 + Math.floor(n / 2) * 14]; } }
                      else { let hb = -1, hd = 13; [[25, 32], [55, 22], [80, 42]].forEach(([hx, hy], h) => { if (holes[h] >= 0) return; const d = Math.hypot(hx - nx, hy - ny); if (d < hd) { hd = d; hb = h; } });
                        if (hb >= 0) { holes[hb] = i; placed[i] = true; pos[i] = [[25, 55, 80][hb], [32, 22, 42][hb] - 6]; } }
                      const nxA = { ...act, pos, placed, holes }; setAct(nxA); if (placed.filter(Boolean).length >= A.need) setTimeout(() => winAct(nxA), 250);
                    }}>
                    <IsoIcon k={act.id === 'boxes' ? 'house' : 'park'} c={act.id === 'boxes' ? ['#F3E3B5', '#E2D3A0', '#CDB98A', '#CDB98A'] : ['#BAC94A', '#7A5434', '#7A5434', '#BAC94A']} />
                  </Drag>
                ))}
              </>
            )}
            {act.won && <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 }}><Txt size={18} weight="800" center>{tx(A.thanks)}</Txt><Row gap={4}><Coin /><Txt size={15} weight="800">+{A.gain}</Txt></Row></View>}
          </View>
          <Pressable onPress={closeAct} style={[s.btn, { backgroundColor: act.won ? '#BAC94A' : '#D5EFE8' }]}><Txt size={15} weight="800" center>{act.won ? (calm ? T('يلا', 'Next') : T('تم', 'Done')) : calm ? T('خلّصت', 'Finished') : T('بعدين', 'Later')}</Txt></Pressable>
        </View>
      )}

      {cheer && (
        <View style={[s.cheer, { paddingTop: insets.top + 60 }]}>
          <Avatar size={110} talking />
          <Txt size={22} weight="800" center>{T('خلصنا! ساعدتِ جارنا، وأنتِ بعد كنتِ شجاعة اليوم.', 'All done! You helped a neighbour, and you were brave today.')}</Txt>
          <Row gap={4}><Coin size={22} /><Txt size={18} weight="800">+150</Txt></Row>
          <Pressable onPress={() => { setCheer(false); setCalm(false); }} style={[s.btn, { backgroundColor: C.mint, alignSelf: 'stretch' }]}><Txt size={16} weight="800" center>{T('رجوع لحيّك', 'Back to your district')}</Txt></Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  top: { position: 'absolute', left: 12, right: 12 },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,.92)', alignItems: 'center', justifyContent: 'center' },
  chip: { height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,.92)', paddingHorizontal: 12 },
  chipS: { height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.92)', paddingHorizontal: 10, justifyContent: 'center' },
  face: { width: 62, height: 62, borderRadius: 31, borderWidth: 3, borderColor: '#FFFFFF', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  bubble: { flex: 1, backgroundColor: 'rgba(255,255,255,.95)', borderRadius: 18, paddingVertical: 8, paddingHorizontal: 12 },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,.7)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: C.tealMid, borderRadius: 4 },
  tasks: { backgroundColor: 'rgba(255,255,255,.97)', borderRadius: 18, padding: 12, marginTop: 8 },
  reward: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, minWidth: 46, alignItems: 'center' },
  plot: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#0F2E30', shadowOpacity: 0.25, shadowRadius: 6 },
  coin: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#0F2E30', shadowOpacity: 0.25, shadowRadius: 6 },
  npc: { backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 3, paddingHorizontal: 4 },
  npcI: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badge: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tip: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#FFF' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,.96)', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 12 },
  card: { width: 92, borderRadius: 18, borderWidth: 1.5, padding: 8, alignItems: 'center', gap: 4 },
  tabs: { marginHorizontal: 12, backgroundColor: '#F3F8F6', borderRadius: 20, padding: 4, justifyContent: 'space-between' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 16, gap: 2 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 16, gap: 10, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16 },
  area: { height: 300, borderRadius: 20, backgroundColor: '#DDE6A8', overflow: 'hidden' },
  goal: { position: 'absolute', width: 56, height: 56, marginLeft: -28, marginTop: -28, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: C.teal, backgroundColor: 'rgba(255,255,255,.7)', alignItems: 'center', justifyContent: 'center' },
  hole: { position: 'absolute', width: 64, height: 40, marginLeft: -32, marginTop: -20, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  target: { position: 'absolute', transform: [{ translateX: -52 }, { translateY: -48 }], borderWidth: 2, borderColor: '#FFF', backgroundColor: 'rgba(255,255,255,.15)', alignItems: 'center', justifyContent: 'center' },
  btn: { borderRadius: 999, paddingVertical: 13 },
  cheer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(243,248,246,.97)', alignItems: 'center', gap: 16, paddingHorizontal: 28 },
});
